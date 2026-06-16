from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from database import Base, engine
from routers import (
    sessions_router,
    messages_router,
    feedback_router,
    grammar_router,
    grammar_progress_router,
    vocabulary_router,
    card_review_router,
)
from models.deck import Deck
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def seed_vocabulary_decks():
    """Auto-seed vocabulary decks from deck_definitions.json if no decks exist.
    
    This function is called on application startup to ensure vocabulary data
    is available for development. It only seeds if no decks currently exist.
    
    Note: Tables are created by the startup event handler before this is called.
    """
    # Check if any decks exist
    async with AsyncSession(engine) as session:
        result = await session.execute(select(Deck.id))
        deck_count = len(result.scalars().all())
        
        if deck_count > 0:
            print(f"Vocabulary decks already exist ({deck_count} decks) - skipping seed")
            return
        
        print("No vocabulary decks found - seeding from deck_definitions.json...")
        
        # Import here to avoid circular imports
        from seed_database import seed_database
        await seed_database()


app = FastAPI(
    title="French Language Coach",
    description="Immersive French conversation practice with AI feedback",
    version="0.1.0",
)

# CORS Middleware - Allow requests from Vite dev server and same-origin
# In development: Vite runs on http://localhost:5173
# In production: React app is served from same origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Serve static files (React build output in production)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Auto-seed vocabulary decks if database is empty
    await seed_vocabulary_decks()


# Include API routers
app.include_router(sessions_router)
app.include_router(messages_router)
app.include_router(feedback_router)
app.include_router(grammar_router)
app.include_router(grammar_progress_router)
app.include_router(vocabulary_router)
app.include_router(card_review_router)


@app.get("/")
async def root():
    return RedirectResponse(url="/static/index.html")


# SPA Fallback: Serve index.html for all routes not matching API endpoints
# This must be the last route registered so it doesn't interfere with API routes
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """
    SPA fallback route for client-side routing.
    
    FastAPI evaluates routes in order, so this catch-all route
    only handles requests that don't match any API route.
    
    Returns the React app's index.html so React Router can handle
    client-side navigation for routes like /chat/:sessionId, /feedback/:sessionId.
    """
    try:
        with open("static/index.html", "r") as f:
            content = f.read()
        return HTMLResponse(content=content, status_code=200)
    except FileNotFoundError:
        # Fallback redirect if static/index.html doesn't exist
        return RedirectResponse(url="/static/index.html")
