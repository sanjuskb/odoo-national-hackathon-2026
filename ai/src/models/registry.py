"""
Model Registry Pattern.

Maintains available model architectures, heuristic engines, and handles
dynamic lookup and fallback resolution.
"""

from typing import Dict, List, Optional, Type

from ai.src.core.exceptions import ModelNotFoundError
from ai.src.models.base import BaselineHeuristicModel, BaseModel
from ai.src.utils.logging import get_logger

logger = get_logger("ai.models.registry")


class ModelRegistry:
    """Singleton registry tracking available models."""

    def __init__(self):
        self._models: Dict[str, BaseModel] = {}
        self._classes: Dict[str, Type[BaseModel]] = {}
        # Pre-register default baseline
        self.register_instance(BaselineHeuristicModel())

    def register_instance(self, model: BaseModel) -> None:
        """Register an active instance of a BaseModel."""
        self._models[model.name] = model
        logger.info("Registered model instance: %s (v%s)", model.name, model.version)

    def register_class(self, name: str, model_cls: Type[BaseModel]) -> None:
        """Register a model class for lazy instantiation."""
        self._classes[name] = model_cls
        logger.info("Registered model class: %s", name)

    def get_model(self, name: str) -> BaseModel:
        """
        Retrieve a registered model instance by name.
        Raises ModelNotFoundError if not found.
        """
        if name in self._models:
            return self._models[name]

        if name in self._classes:
            instance = self._classes[name]()
            self._models[name] = instance
            return instance

        raise ModelNotFoundError(
            message=f"Model '{name}' is not registered in the ModelRegistry.",
            details={"available_models": list(self._models.keys())},
        )

    def list_models(self) -> List[str]:
        """List names of all registered models."""
        return list(set(list(self._models.keys()) + list(self._classes.keys())))


_GLOBAL_REGISTRY: Optional[ModelRegistry] = None


def get_model_registry() -> ModelRegistry:
    """Return the global model registry instance."""
    global _GLOBAL_REGISTRY
    if _GLOBAL_REGISTRY is None:
        _GLOBAL_REGISTRY = ModelRegistry()
    return _GLOBAL_REGISTRY

