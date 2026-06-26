import json
import os
import random
import string
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
}


def _resp(status, body):
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'isBase64Encoded': False,
        'body': json.dumps(body),
    }


def _gen_code():
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return ''.join(random.choice(chars) for _ in range(12))


def handler(event: dict, context) -> dict:
    '''Сигнализация WebRTC: комнаты, участники, обмен offer/answer/ICE для голосовых звонков.'''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'isBase64Encoded': False, 'body': ''}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor()

    try:
        body = json.loads(event.get('body') or '{}')
        action = body.get('action')

        if action == 'create':
            code = _gen_code()
            host_id = body['userId']
            name = (body.get('name') or 'Гость')[:40]
            cur.execute("INSERT INTO rooms (code, host_id) VALUES (%s, %s)", (code, host_id))
            cur.execute(
                "INSERT INTO participants (id, room_code, name, is_host) VALUES (%s, %s, %s, TRUE)",
                (host_id, code, name),
            )
            return _resp(200, {'code': code})

        if action == 'join':
            code = (body.get('code') or '').upper()[:12]
            user_id = body['userId']
            name = (body.get('name') or 'Гость')[:40]
            cur.execute("SELECT closed FROM rooms WHERE code = %s", (code,))
            row = cur.fetchone()
            if row is None:
                return _resp(404, {'error': 'not_found'})
            if row[0]:
                return _resp(410, {'error': 'closed'})
            cur.execute(
                "INSERT INTO participants (id, room_code, name) VALUES (%s, %s, %s) "
                "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, active = TRUE, kicked = FALSE",
                (user_id, code, name),
            )
            return _resp(200, {'code': code})

        if action == 'poll':
            code = (body.get('code') or '').upper()[:12]
            user_id = body['userId']
            cur.execute("SELECT closed FROM rooms WHERE code = %s", (code,))
            room = cur.fetchone()
            if room is None or room[0]:
                return _resp(200, {'closed': True, 'participants': [], 'signals': []})

            cur.execute("SELECT kicked FROM participants WHERE id = %s", (user_id,))
            me = cur.fetchone()
            if me and me[0]:
                return _resp(200, {'kicked': True, 'participants': [], 'signals': []})

            cur.execute("UPDATE participants SET last_seen = CURRENT_TIMESTAMP, active = TRUE WHERE id = %s", (user_id,))

            cur.execute(
                "SELECT id, name, is_host, muted FROM participants "
                "WHERE room_code = %s AND active = TRUE AND kicked = FALSE "
                "AND last_seen > CURRENT_TIMESTAMP - INTERVAL '15 seconds' ORDER BY joined_at",
                (code,),
            )
            participants = [
                {'id': r[0], 'name': r[1], 'isHost': r[2], 'muted': r[3]} for r in cur.fetchall()
            ]

            after = int(body.get('lastSignalId') or 0)
            cur.execute(
                "SELECT id, from_id, kind, payload FROM signals "
                "WHERE room_code = %s AND to_id = %s AND id > %s ORDER BY id LIMIT 50",
                (code, user_id, after),
            )
            signals = [
                {'id': r[0], 'from': r[1], 'kind': r[2], 'payload': r[3]} for r in cur.fetchall()
            ]
            return _resp(200, {'participants': participants, 'signals': signals})

        if action == 'signal':
            cur.execute(
                "INSERT INTO signals (room_code, from_id, to_id, kind, payload) VALUES (%s, %s, %s, %s, %s)",
                (
                    (body.get('code') or '').upper()[:12],
                    body['from'],
                    body['to'],
                    body['kind'][:20],
                    body['payload'],
                ),
            )
            return _resp(200, {'ok': True})

        if action == 'mute':
            cur.execute(
                "UPDATE participants SET muted = %s WHERE id = %s",
                (bool(body.get('muted')), body['userId']),
            )
            return _resp(200, {'ok': True})

        if action == 'kick':
            code = (body.get('code') or '').upper()[:12]
            host_id = body['userId']
            target = body['targetId']
            cur.execute("SELECT host_id FROM rooms WHERE code = %s", (code,))
            row = cur.fetchone()
            if not row or row[0] != host_id:
                return _resp(403, {'error': 'forbidden'})
            cur.execute("UPDATE participants SET kicked = TRUE, active = FALSE WHERE id = %s", (target,))
            return _resp(200, {'ok': True})

        if action == 'leave':
            code = (body.get('code') or '').upper()[:12]
            user_id = body['userId']
            cur.execute("UPDATE participants SET active = FALSE WHERE id = %s", (user_id,))
            cur.execute("SELECT host_id FROM rooms WHERE code = %s", (code,))
            row = cur.fetchone()
            if row and row[0] == user_id:
                cur.execute("UPDATE rooms SET closed = TRUE WHERE code = %s", (code,))
            return _resp(200, {'ok': True})

        return _resp(400, {'error': 'unknown_action'})
    finally:
        cur.close()
        conn.close()
