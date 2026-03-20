import psycopg2
import urllib.parse

try:
    encoded_password = urllib.parse.quote_plus("uniglobe@123")
    conn = psycopg2.connect(f"postgresql://postgres:{encoded_password}@localhost:5432/jobgenie")
    cur = conn.cursor()

    commands = [
        "ALTER TABLE courses ADD COLUMN IF NOT EXISTS category VARCHAR(100);"
    ]

    for cmd in commands:
        cur.execute(cmd)
        print(f"Executed: {cmd}")

    conn.commit()
    cur.close()
    conn.close()
    print("Database schema updated with category column.")
except Exception as e:
    print(f"Error: {e}")
