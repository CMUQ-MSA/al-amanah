"""Shared rate limiter for SlowAPI. Use this in all routers that need rate limiting."""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
