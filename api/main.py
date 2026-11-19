from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import health, agent as agent_routes

app = FastAPI(title="Anticipatory Commerce Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(agent_routes.router)
