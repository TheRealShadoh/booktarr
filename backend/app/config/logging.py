"""
Logging configuration for Booktarr application
"""
import logging
import sys
from datetime import datetime
import os

def setup_logging(log_level: str = "INFO"):
    """
    Configure logging for the application
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    # Convert string to logging level
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(formatter)
    
    # Create file handler (if LOG_FILE is set)
    handlers = [console_handler]
    
    log_file = os.getenv("LOG_FILE")
    if log_file:
        try:
            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(numeric_level)
            file_handler.setFormatter(formatter)
            handlers.append(file_handler)
        except Exception as e:
            print(f"Warning: Could not create file handler for {log_file}: {e}")
    
    # Configure root logger
    logging.basicConfig(
        level=numeric_level,
        handlers=handlers,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Set specific logger levels
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    # Log startup message
    logger = logging.getLogger("booktarr")
    logger.info("🚀 Booktarr logging configured")
    logger.info(f"📊 Log level: {log_level.upper()}")
    if log_file:
        logger.info(f"📄 Log file: {log_file}")

class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for different log levels"""
    
    COLORS = {
        'DEBUG': '\033[94m',      # Blue
        'INFO': '\033[92m',       # Green
        'WARNING': '\033[93m',    # Yellow
        'ERROR': '\033[91m',      # Red
        'CRITICAL': '\033[95m',   # Magenta
        'RESET': '\033[0m'        # Reset
    }
    
    def format(self, record):
        # Add color to levelname
        levelname = record.levelname
        if levelname in self.COLORS:
            colored_levelname = f"{self.COLORS[levelname]}{levelname}{self.COLORS['RESET']}"
            record.levelname = colored_levelname
        
        # Format the message
        formatted = super().format(record)
        
        # Reset levelname for future use
        record.levelname = levelname
        
        return formatted

def setup_colored_logging(log_level: str = "INFO"):
    """
    Configure colored logging for development
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    # Convert string to logging level
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Create colored formatter
    formatter = ColoredFormatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(formatter)
    
    # Configure root logger
    logging.basicConfig(
        level=numeric_level,
        handlers=[console_handler],
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Set specific logger levels
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    # Log startup message
    logger = logging.getLogger("booktarr")
    logger.info("🎨 Colored logging configured")
    logger.info(f"📊 Log level: {log_level.upper()}")

# Logging utility functions
def get_logger(name: str) -> logging.Logger:
    """Get a logger with the specified name"""
    return logging.getLogger(name)

def log_request(method: str, url: str, status_code: int, duration: float):
    """Log HTTP request details"""
    logger = get_logger("booktarr.requests")
    logger.info(f"{method} {url} - {status_code} ({duration:.3f}s)")

def log_api_call(service: str, endpoint: str, success: bool, duration: float):
    """Log external API call details"""
    logger = get_logger("booktarr.api")
    status = "✅ SUCCESS" if success else "❌ FAILED"
    logger.info(f"{service} {endpoint} - {status} ({duration:.3f}s)")

def log_cache_operation(operation: str, key: str, hit: bool = None):
    """Log cache operation details"""
    logger = get_logger("booktarr.cache")
    if hit is not None:
        status = "HIT" if hit else "MISS"
        logger.debug(f"Cache {operation} - {key} - {status}")
    else:
        logger.debug(f"Cache {operation} - {key}")

def log_settings_change(field: str, old_value: str, new_value: str):
    """Log settings change"""
    logger = get_logger("booktarr.settings")
    logger.info(f"Settings changed: {field} = {old_value} → {new_value}")

def log_error(error: Exception, context: str = ""):
    """Log error with context"""
    logger = get_logger("booktarr.errors")
    if context:
        logger.error(f"Error in {context}: {str(error)}", exc_info=True)
    else:
        logger.error(f"Error: {str(error)}", exc_info=True)