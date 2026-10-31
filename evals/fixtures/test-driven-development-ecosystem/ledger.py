"""Simple in-memory ledger utilities."""


def apply_entries(balance, entries):
    """Apply entries to a starting balance and return the result.

    Entries are (kind, amount) tuples. Only "credit" entries are
    supported; anything else raises ValueError.
    """
    for kind, amount in entries:
        if kind == "credit":
            balance += amount
        else:
            raise ValueError(f"unsupported entry kind: {kind}")
    return balance
