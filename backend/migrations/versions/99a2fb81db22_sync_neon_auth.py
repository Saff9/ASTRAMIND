"""sync neon auth

Revision ID: 99a2fb81db22
Revises: 057843a1237f
Create Date: 2026-04-18 17:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99a2fb81db22'
down_revision: Union[str, None] = '057843a1237f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update 'users' table: Add 'auth_id' column
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('auth_id', sa.String(length=255), nullable=True))
    
    # Pre-populate auth_id with email for existing users (failsafe identity mapping)
    op.execute("UPDATE users SET auth_id = email WHERE auth_id IS NULL")
    
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('auth_id', nullable=False)
        batch_op.create_index(batch_op.f('ix_users_auth_id'), ['auth_id'], unique=True)

    # 2. Update 'user_configs' table: Transition from user_id (Int) to auth_id (String)
    # We add a temporary column, migrate data based on foreign key, then swap
    with op.batch_alter_table('user_configs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('auth_id_transition', sa.String(length=255), nullable=True))

    # Migration: Find the email for each user_id and copy to the new auth_id column
    op.execute("""
        UPDATE user_configs 
        SET auth_id_transition = (SELECT email FROM users WHERE users.id = user_configs.user_id)
    """)
    
    with op.batch_alter_table('user_configs', schema=None) as batch_op:
        # Drop the old Int column and clean up its index
        batch_op.drop_index('ix_user_configs_user_id')
        batch_op.drop_column('user_id')
        
        # Rename transition column to final auth_id and set constraints
        batch_op.alter_column('auth_id_transition', new_column_name='auth_id', nullable=False)
        batch_op.create_index(batch_op.f('ix_user_configs_auth_id'), ['auth_id'], unique=True)


def downgrade() -> None:
    # Reverse user_configs changes
    with op.batch_alter_table('user_configs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_user_configs_auth_id'))
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=True))
        batch_op.drop_column('auth_id')
    
    # Reverse users changes
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_auth_id'))
        batch_op.drop_column('auth_id')
    
    # Reverse changes for users
    op.drop_index(op.f('ix_users_auth_id'), table_name='users')
    op.drop_column('users', 'auth_id')
