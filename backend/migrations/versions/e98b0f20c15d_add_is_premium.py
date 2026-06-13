"""add is_premium column

Revision ID: e98b0f20c15d
Revises: 99a2fb81db22
Create Date: 2026-06-13 17:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e98b0f20c15d'
down_revision: Union[str, None] = '99a2fb81db22'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'is_premium' column to 'users' table
    op.add_column('users', sa.Column('is_premium', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'is_premium')
