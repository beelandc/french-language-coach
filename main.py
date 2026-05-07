from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from database import Base, engine
from routers import (
    sessions_router,
    messages_router,
    feedback_router,
)

app = FastAPI(
    title="French Language Coach",
    description="Immersive French conversation practice with AI feedback",
    version="0.1.0",
)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


app.include_router(sessions_router)
app.include_router(messages_router)
app.include_router(feedback_router)


@app.get("/")
async def root():
    return RedirectResponse(url="/static/index.html")
