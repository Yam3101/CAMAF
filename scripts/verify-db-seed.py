import json
import os
import sqlite3


db_path = os.path.join(os.environ["APPDATA"], "camaf", "camaf.db")
connection = sqlite3.connect(db_path)
connection.row_factory = sqlite3.Row
cursor = connection.cursor()

summary = {
    "assets": cursor.execute("SELECT COUNT(*) AS n FROM assets").fetchone()["n"],
    "users": cursor.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"],
    "areas": cursor.execute("SELECT COUNT(*) AS n FROM areas").fetchone()["n"],
    "assigned": cursor.execute("SELECT COUNT(*) AS n FROM assets WHERE status = 'asignado'").fetchone()["n"],
    "baja": cursor.execute("SELECT COUNT(*) AS n FROM assets WHERE status = 'baja'").fetchone()["n"],
    "sample": [
        dict(row)
        for row in cursor.execute(
            "SELECT internalId, nombre, tipo, status FROM assets ORDER BY createdAt LIMIT 3"
        ).fetchall()
    ],
}

connection.close()
print(json.dumps(summary, ensure_ascii=False, indent=2))
