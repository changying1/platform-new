alarm_clients = []

async def push_alarm(data):

    disconnected = []

    for ws in alarm_clients:
        try:
            await ws.send_json(data)
        except:
            disconnected.append(ws)

    for ws in disconnected:
        alarm_clients.remove(ws)