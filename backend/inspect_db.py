import sqlite3

con = sqlite3.connect("agri.db")
cur = con.cursor()

tables = cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
print("=== TABLES ===")
for t in tables:
    print("  " + t[0])

print()
for t in tables:
    name = t[0]
    cols = cur.execute("PRAGMA table_info(" + name + ")").fetchall()
    count = cur.execute("SELECT COUNT(*) FROM " + name).fetchone()[0]
    print("--- " + name + " (" + str(count) + " rows) ---")
    for c in cols:
        print("  " + c[1].ljust(25) + " " + c[2])
    print()

con.close()
