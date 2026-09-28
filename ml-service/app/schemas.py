from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class ExpenseItem(BaseModel):
    id: str
    amount: float = Field(gt=0)
    category: str
    date: str
    transactionType: str = "NEED"
    recurring: bool = False
    description: str = ""


class IncomeItem(BaseModel):
    amount: float = Field(gt=0)
    date: str


class TrainRequest(BaseModel):
    userId: str
    expenses: List[ExpenseItem]
    incomes: List[IncomeItem] = []


class PredictRequest(TrainRequest):
    pass


class AnomalyRequest(BaseModel):
    userId: str
    expenses: List[ExpenseItem]
