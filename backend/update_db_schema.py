import psycopg2
import urllib.parse
import sys

try:
    encoded_password = urllib.parse.quote_plus("uniglobe@123")
    conn = psycopg2.connect(f"postgresql://postgres:{encoded_password}@localhost:5432/jobgenie")
    cur = conn.cursor()

    commands = [
        "ALTER TABLE courses ADD COLUMN IF NOT EXISTS level VARCHAR(50);",
        "ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration VARCHAR(100);",
        "ALTER TABLE courses ADD COLUMN IF NOT EXISTS institution VARCHAR(150);",
        "ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT;"
    ]

    for cmd in commands:
        try:
            cur.execute(cmd)
            print(f"Executed: {cmd}")
        except Exception as e:
            print(f"Error executing {cmd}: {e}")
            conn.rollback()

    conn.commit()
    cur.close()
    conn.close()
    print("Database schema updated successfully.")
except Exception as e:
    print(f"Failed to connect to database: {e}")
    sys.exit(1)
