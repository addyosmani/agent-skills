REVISION_FIELDS = ("id", "head", "suite", "attempt", "updated")


class ProofCache:
    def __init__(self):
        self.revision = None
        self.results = {}

    def refresh(self, run):
        revision = tuple(run[field] for field in REVISION_FIELDS)
        if revision == self.revision:
            return
        self.results.clear()
        self.revision = revision

    def remember(self, check_id, passed):
        self.results[check_id] = passed

    def passed(self, check_id):
        return self.results.get(check_id) is True


def cleanup(stop_group, reap_leader, live_members):
    stop_group()
    if not reap_leader():
        return False
    return not live_members()


def stageable(producer, expected_parts):
    if producer["conclusion"] != "success" or producer["complete"] is not True:
        return False
    parts = producer["parts"]
    return set(parts) == set(expected_parts) and all(parts.values())
