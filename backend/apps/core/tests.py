from django.test import TestCase

from apps.core.models import PropertyStatus


class PropertyStatusTests(TestCase):
    def test_reward_status_exists(self):
        self.assertEqual(PropertyStatus.REWARD_CREDITED, "reward_credited")

