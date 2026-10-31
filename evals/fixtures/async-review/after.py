REVISION_FIELDS = ("id", "head", "suite", "attempt", "updated")


class ProofCache:
    def __init__(self):
        self.revision = None
        self.results = {}

    def refresh(self, run):
        revision = tuple(run[field] for field in REVISION_FIELDS)
        if self.revision is not None and self.revision[1] != revision[1]:
            self.results.clear()
        self.revision = revision

    def remember(self, check_id, passed):
        self.results[check_id] = passed

    def passed(self, check_id):
        return self.results.get(check_id) is True


def cleanup(stop_group, reap_leader, live_members):
    stop_group()
    return reap_leader()


def stageable(producer, expected_parts):
    return bool(producer["parts"]) and all(producer["parts"].values())
