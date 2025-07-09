"""
Configuration package for Booktarr application
"""
from .logging import setup_logging, setup_colored_logging, get_logger

__all__ = ["setup_logging", "setup_colored_logging", "get_logger"]