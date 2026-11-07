import sqlite3


def initialize(path):
    with sqlite3.connect(path) as connection:
        connection.execute("CREATE TABLE secret (value TEXT NOT NULL)")
        connection.execute("CREATE TABLE audit (value TEXT NOT NULL)")
        connection.execute("INSERT INTO secret VALUES ('old')")


def snapshot(path):
    with sqlite3.connect(path) as connection:
        value = connection.execute("SELECT value FROM secret").fetchone()[0]
        audit = connection.execute("SELECT value FROM audit").fetchall()
        return value, audit


def replace_secret(path, value, after_write=lambda: None):
    connection = sqlite3.connect(path)
    previous = connection.execute("SELECT value FROM secret").fetchone()[0]
    try:
        connection.execute("UPDATE secret SET value = ?", (value,))
        connection.commit()
        after_write()
        connection.execute("INSERT INTO audit VALUES (?)", (value,))
        connection.commit()
    except Exception:
        connection.rollback()
        connection.execute("UPDATE secret SET value = ?", (previous,))
        connection.commit()
        raise
    finally:
        connection.close()
