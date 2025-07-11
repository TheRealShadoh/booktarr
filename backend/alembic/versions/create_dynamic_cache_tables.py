"""Create dynamic cache and configuration tables

Revision ID: dynamic_cache_v1
Revises: 7d92a1b34567
Create Date: 2025-07-11 03:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func

# revision identifiers
revision = 'dynamic_cache_v1'
down_revision = '7d92a1b34567'
branch_labels = None
depends_on = None

def upgrade():
    # API Response Cache
    op.create_table('api_response_cache',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('cache_key', sa.String(255), nullable=False),
        sa.Column('api_service', sa.String(50), nullable=False),
        sa.Column('request_url', sa.Text(), nullable=False),
        sa.Column('response_data', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('hit_count', sa.Integer(), server_default='0'),
        sa.Column('last_accessed', sa.DateTime(), server_default=func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('cache_key')
    )
    op.create_index('idx_api_service_created', 'api_response_cache', ['api_service', 'created_at'])
    op.create_index('idx_expires_at', 'api_response_cache', ['expires_at'])
    op.create_index('idx_cache_key', 'api_response_cache', ['cache_key'])
    op.create_index('idx_api_service', 'api_response_cache', ['api_service'])

    # API Configurations
    op.create_table('api_configurations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('service_name', sa.String(50), nullable=False),
        sa.Column('config_key', sa.String(100), nullable=False),
        sa.Column('config_value', sa.Text(), nullable=False),
        sa.Column('config_type', sa.String(20), server_default='string'),
        sa.Column('description', sa.Text()),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_service_key', 'api_configurations', ['service_name', 'config_key'], unique=True)
    op.create_index('idx_service_name', 'api_configurations', ['service_name'])

    # Rate Limit Tracking
    op.create_table('rate_limit_tracking',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('api_service', sa.String(50), nullable=False),
        sa.Column('time_window', sa.String(20), nullable=False),
        sa.Column('window_start', sa.DateTime(), nullable=False),
        sa.Column('request_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_service_window_start', 'rate_limit_tracking', ['api_service', 'time_window', 'window_start'], unique=True)
    op.create_index('idx_api_service_rl', 'rate_limit_tracking', ['api_service'])

    # Metadata Enhancement History
    op.create_table('metadata_enhancement_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('isbn', sa.String(13), nullable=False),
        sa.Column('enhancement_type', sa.String(50), nullable=False),
        sa.Column('original_data', sa.Text()),
        sa.Column('enhanced_data', sa.Text()),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('error_message', sa.Text()),
        sa.Column('processing_time_ms', sa.Integer()),
        sa.Column('source_api', sa.String(50)),
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_isbn_meh', 'metadata_enhancement_history', ['isbn'])
    op.create_index('idx_enhancement_type', 'metadata_enhancement_history', ['enhancement_type'])
    op.create_index('idx_isbn_type', 'metadata_enhancement_history', ['isbn', 'enhancement_type'])
    op.create_index('idx_success_created', 'metadata_enhancement_history', ['success', 'created_at'])
    op.create_index('idx_created_at_meh', 'metadata_enhancement_history', ['created_at'])

    # Application Config
    op.create_table('application_config',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('config_section', sa.String(50), nullable=False),
        sa.Column('config_key', sa.String(100), nullable=False),
        sa.Column('config_value', sa.Text(), nullable=False),
        sa.Column('config_type', sa.String(20), server_default='string'),
        sa.Column('description', sa.Text()),
        sa.Column('is_system', sa.Boolean(), server_default='0'),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_section_key', 'application_config', ['config_section', 'config_key'], unique=True)
    op.create_index('idx_config_section', 'application_config', ['config_section'])

    # Feature Flags
    op.create_table('feature_flags',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('flag_name', sa.String(100), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('rollout_percentage', sa.Integer(), server_default='0'),
        sa.Column('target_audience', sa.String(100)),
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('flag_name')
    )
    op.create_index('idx_flag_name', 'feature_flags', ['flag_name'])

    # Job Queue
    op.create_table('job_queue',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('job_type', sa.String(50), nullable=False),
        sa.Column('job_data', sa.Text(), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending', nullable=False),
        sa.Column('priority', sa.Integer(), server_default='0'),
        sa.Column('scheduled_at', sa.DateTime(), server_default=func.now(), nullable=False),
        sa.Column('started_at', sa.DateTime()),
        sa.Column('completed_at', sa.DateTime()),
        sa.Column('error_message', sa.Text()),
        sa.Column('retry_count', sa.Integer(), server_default='0'),
        sa.Column('max_retries', sa.Integer(), server_default='3'),
        sa.Column('worker_id', sa.String(100)),
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_job_type', 'job_queue', ['job_type'])
    op.create_index('idx_status', 'job_queue', ['status'])
    op.create_index('idx_priority', 'job_queue', ['priority'])
    op.create_index('idx_status_priority', 'job_queue', ['status', 'priority'])
    op.create_index('idx_job_type_status', 'job_queue', ['job_type', 'status'])

    # Scheduled Tasks
    op.create_table('scheduled_tasks',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('task_name', sa.String(100), nullable=False),
        sa.Column('task_type', sa.String(50), nullable=False),
        sa.Column('cron_expression', sa.String(100)),
        sa.Column('task_data', sa.Text()),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('last_run', sa.DateTime()),
        sa.Column('next_run', sa.DateTime()),
        sa.Column('run_count', sa.Integer(), server_default='0'),
        sa.Column('failure_count', sa.Integer(), server_default='0'),
        sa.Column('last_error', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('task_name')
    )
    op.create_index('idx_task_name', 'scheduled_tasks', ['task_name'])
    op.create_index('idx_next_run', 'scheduled_tasks', ['next_run'])

    # Series Metadata
    op.create_table('series_metadata',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('series_name', sa.String(200), nullable=False),
        sa.Column('author_name', sa.String(200)),
        sa.Column('total_books', sa.Integer()),
        sa.Column('source_api', sa.String(50), nullable=False),
        sa.Column('metadata_json', sa.Text(), nullable=False),
        sa.Column('quality_score', sa.Integer(), server_default='0'),
        sa.Column('is_verified', sa.Boolean(), server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=func.now()),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_series_name', 'series_metadata', ['series_name'])
    op.create_index('idx_author_name', 'series_metadata', ['author_name'])
    op.create_index('idx_series_author', 'series_metadata', ['series_name', 'author_name'])
    op.create_index('idx_quality_verified', 'series_metadata', ['quality_score', 'is_verified'])
    op.create_index('idx_expires_at_sm', 'series_metadata', ['expires_at'])

    # Search Analytics
    op.create_table('search_analytics',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('search_query', sa.String(500), nullable=False),
        sa.Column('search_type', sa.String(50), nullable=False),
        sa.Column('result_count', sa.Integer(), server_default='0'),
        sa.Column('response_time_ms', sa.Integer()),
        sa.Column('api_sources_used', sa.Text()),
        sa.Column('user_agent', sa.String(500)),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('was_cached', sa.Boolean(), server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_search_query', 'search_analytics', ['search_query'])
    op.create_index('idx_search_type', 'search_analytics', ['search_type'])
    op.create_index('idx_query_type', 'search_analytics', ['search_query', 'search_type'])
    op.create_index('idx_created_cached', 'search_analytics', ['created_at', 'was_cached'])
    op.create_index('idx_created_at_sa', 'search_analytics', ['created_at'])

def downgrade():
    op.drop_table('search_analytics')
    op.drop_table('series_metadata')
    op.drop_table('scheduled_tasks')
    op.drop_table('job_queue')
    op.drop_table('feature_flags')
    op.drop_table('application_config')
    op.drop_table('metadata_enhancement_history')
    op.drop_table('rate_limit_tracking')
    op.drop_table('api_configurations')
    op.drop_table('api_response_cache')