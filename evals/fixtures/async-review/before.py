REVISION_FIELDS = ("id", "head", "suite", "attempt", "updated")


class ProofCache:
    def __init__(self):
        self.revision = None
        self.results = {}

    def refresh(self, run):
        revision = tuple(run[field] for field in REVISION_FIELDS)
        if self.revision != revision:
            self.results.clear()
        self.revision = revision

    def remember(self, check_id, passed):
        self.results[check_id] = passed

    def passed(self, check_id):
        return self.results.get(check_id) is True


def cleanup(stop_group, reap_leader, live_members):
    stop_group()
    reaped = reap_leader()
    return reaped and not live_members()


def stageable(producer, expected_parts):
    return (
        producer["conclusion"] == "success"
        and producer["complete"] is True
        and set(producer["parts"]) == set(expected_parts)
        and all(producer["parts"].values())
    )
