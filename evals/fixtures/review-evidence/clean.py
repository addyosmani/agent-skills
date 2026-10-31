def allowed(balance, amount):
    return amount > 0 and amount <= balance


def fee(plan):
    return 0


def lookup(owner, accounts):
    return accounts[owner]


def withdraw(actor, owner, amount, accounts):
    if actor != owner:
        raise PermissionError("owner required")
    balance = lookup(owner, accounts)
    if not allowed(balance, amount):
        raise ValueError("invalid amount")
    accounts[owner] = balance - amount
    return accounts[owner]
