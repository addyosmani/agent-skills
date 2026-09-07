import unittest

from ledger import apply_entries


class ApplyEntriesTest(unittest.TestCase):
    def test_applies_a_single_credit(self):
        self.assertEqual(apply_entries(100, [("credit", 25)]), 125)

    def test_applies_multiple_credits_in_order(self):
        self.assertEqual(apply_entries(0, [("credit", 10), ("credit", 5)]), 15)

    def test_rejects_unknown_entry_kinds(self):
        with self.assertRaises(ValueError):
            apply_entries(0, [("transfer", 10)])


if __name__ == "__main__":
    unittest.main()
