from pathlib import Path
import tempfile
import unittest

from vault import initialize, replace_secret, snapshot


class ReplaceSecretTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.database = Path(self.directory.name) / "vault.sqlite"
        initialize(self.database)

    def test_success_persists_replacement_and_audit(self):
        replace_secret(self.database, "new")
        self.assertEqual(snapshot(self.database), ("new", [("new",)]))

    def test_exception_restores_previous_value(self):
        def interrupted():
            raise RuntimeError("audit interrupted")

        with self.assertRaisesRegex(RuntimeError, "audit interrupted"):
            replace_secret(self.database, "new", interrupted)
        self.assertEqual(snapshot(self.database), ("old", []))


if __name__ == "__main__":
    unittest.main()
