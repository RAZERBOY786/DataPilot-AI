from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Union
from datetime import datetime


class UserRegister(BaseModel):
    email: str
    name: str
    password: str = Field(..., min_length=8, max_length=200, description="At least 8 characters")


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class DatasetCreate(BaseModel):
    name: str


class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[str] = None
    health_score: Optional[int] = None


class ProfileCreate(BaseModel):
    column_name: str
    data_type: str
    distinct_count: int = 0
    missing_count: int = 0
    missing_pct: float = 0
    stats_json: dict = {}
    distribution_type: str = "unknown"
    integrity_flags: list = []


class ConversationCreate(BaseModel):
    dataset_id: Optional[int] = None
    title: str = "New Analysis"


class MessageCreate(BaseModel):
    content: str


class WorkspaceUpdate(BaseModel):
    llm_engine: Optional[str] = None
    temperature: Optional[float] = None
    confidence_threshold: Optional[int] = None
    zdr_mode: Optional[int] = None
    schema_verification: Optional[int] = None
    pyodide_sandbox: Optional[int] = None
    hipaa_shield: Optional[int] = None
    dynamic_masking: Optional[int] = None
    masking_rules: Optional[Union[str, dict]] = None


class TeamInvite(BaseModel):
    email: str
    role: str = "data_analyst"


class ApiKeyCreate(BaseModel):
    name: str
    scopes: list = []


class WebhookCreate(BaseModel):
    name: str
    url: str
    event: str
