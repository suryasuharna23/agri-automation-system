"""One-shot script to rename mock-lahan-* nodes in the SQLite DB."""
import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "backend" / "agri.db"

RENAMES = [
    ("mock-lahan-01", "lahan-1", "Lahan 1 (Tomat)"),
    ("mock-lahan-02", "lahan-2", "Lahan 2 (Cabai)"),
    ("mock-lahan-03", "lahan-3", "Lahan 3 (Selada Hidroponik)"),
]

with sqlite3.connect(DB) as con:
    cur = con.cursor()
    for old_id, new_id, new_name in RENAMES:
        cur.execute(
            "UPDATE sensor_nodes SET device_id = ?, name = ? WHERE device_id = ?",
            (new_id, new_name, old_id),
        )
        print(f"  {old_id!r} -> device_id={new_id!r}, name={new_name!r}  ({cur.rowcount} row(s))")
    con.commit()

print("Done.")
