"""Contract probes for one supplied snapshot; uses no hosted service/processes."""

import runpy
import sys
import unittest

snapshot = runpy.run_path(sys.argv.pop(1))


class ContractTests(unittest.TestCase):
    def cache(self):
        run = {"id": 7, "head": "abc", "suite": 8, "attempt": 1, "updated": "t1"}
        cache = snapshot["ProofCache"]()
        cache.refresh(run)
        cache.remember(9, True)
        return cache, run

    def test_changed_revision_invalidates_green(self):
        for field, changed in (("id", 10), ("head", "def"), ("suite", 11),
                               ("attempt", 2), ("updated", "t2")):
            with self.subTest(field=field):
                cache, run = self.cache()
                cache.refresh({**run, field: changed})
                self.assertFalse(cache.passed(9))

    def test_same_revision_keeps_green(self):
        cache, run = self.cache()
        cache.refresh(dict(run))
        self.assertTrue(cache.passed(9))

    def cleanup(self, reaped, members):
        calls = []
        result = snapshot["cleanup"](
            lambda: calls.append("stop"),
            lambda: calls.append("reap") or reaped,
            lambda: calls.append("live") or members,
        )
        self.assertEqual(calls[:2], ["stop", "reap"])
        return result

    def test_surviving_child_blocks_cleanup(self):
        self.assertFalse(self.cleanup(True, [101]))

    def test_empty_group_allows_cleanup(self):
        self.assertTrue(self.cleanup(True, []))

    def test_failed_reap_blocks_cleanup(self):
        self.assertFalse(self.cleanup(False, []))

    def producer(self, **changes):
        return {"conclusion": "success", "complete": True,
                "parts": {"unit": b"u", "functional": b"f"}, **changes}

    def test_partial_reports_never_stage(self):
        for changes in ({"conclusion": "failure"}, {"complete": False},
                        {"parts": {"unit": b"partial"}},
                        {"parts": {"unit": b"u", "functional": b""}}):
            with self.subTest(changes=changes):
                self.assertFalse(snapshot["stageable"](
                    self.producer(**changes), {"unit", "functional"}))

    def test_complete_successful_report_stages(self):
        self.assertTrue(snapshot["stageable"](
            self.producer(), {"unit", "functional"}))


unittest.main()
