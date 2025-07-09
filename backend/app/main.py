from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import books

app = FastAPI(title="Booktarr API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:80"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(books.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Booktarr API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}