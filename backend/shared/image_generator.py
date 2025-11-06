"""
Image Generator Utility

This module provides functionality to generate AI images using Gemini Imagen
for task visualizations. Images are generated based on task type and description,
then stored in Cloud Storage.
"""

import os
import uuid
import logging
from typing import Optional, Dict, Any
from datetime import datetime

from google.cloud import storage
from vertexai.preview.vision_models import ImageGenerationModel
import vertexai

from .config import PROJECT_ID, VERTEX_AI_LOCATION

logger = logging.getLogger(__name__)


class ImageGenerationError(Exception):
    """Raised when image generation fails."""
    pass


class ImageGenerator:
    """
    Handles AI image generation using Gemini Imagen and storage in Cloud Storage.
    """
    
    def __init__(self):
        """Initialize the image generator with Vertex AI and Cloud Storage."""
        if not PROJECT_ID:
            raise ImageGenerationError("PROJECT_ID not configured")
        
        # Initialize Vertex AI
        vertexai.init(project=PROJECT_ID, location=VERTEX_AI_LOCATION)
        
        # Initialize Imagen model
        self.model = ImageGenerationModel.from_pretrained("imagen-3.0-generate-001")
        
        # Initialize Cloud Storage client
        self.storage_client = storage.Client(project=PROJECT_ID)
        
        # Get or create bucket for task images
        self.bucket_name = f"{PROJECT_ID}-task-images"
        self.bucket = self._get_or_create_bucket()
    
    def _get_or_create_bucket(self) -> storage.Bucket:
        """Get existing bucket or create new one for task images."""
        try:
            bucket = self.storage_client.get_bucket(self.bucket_name)
            logger.info(f"Using existing bucket: {self.bucket_name}")
            return bucket
        except Exception:
            # Bucket doesn't exist, create it
            try:
                bucket = self.storage_client.create_bucket(
                    self.bucket_name,
                    location=VERTEX_AI_LOCATION
                )
                logger.info(f"Created new bucket: {self.bucket_name}")
                return bucket
            except Exception as e:
                logger.error(f"Failed to create bucket: {e}")
                raise ImageGenerationError(f"Could not create storage bucket: {e}")
    
    def generate_task_image(
        self,
        task_type: str,
        task_description: str,
        job_title: str
    ) -> Optional[str]:
        """
        Generate an image for a task based on its type and description.
        
        Args:
            task_type: Type of task (designer, engineer, analyst, etc.)
            task_description: Description of the task
            job_title: The player's job title for context
        
        Returns:
            Public URL of the generated image, or None if generation fails
        """
        try:
            # Create prompt based on task type
            prompt = self._create_image_prompt(task_type, task_description, job_title)
            
            if not prompt:
                logger.warning(f"No image prompt generated for task type: {task_type}")
                return None
            
            logger.info(f"Generating image with prompt: {prompt[:100]}...")
            
            # Generate image using Imagen
            response = self.model.generate_images(
                prompt=prompt,
                number_of_images=1,
                aspect_ratio="16:9",
                safety_filter_level="block_some",
                person_generation="allow_adult"
            )
            
            if not response.images:
                logger.warning("No images generated")
                return None
            
            # Get the first generated image
            image = response.images[0]
            
            # Upload to Cloud Storage
            image_url = self._upload_image(image._pil_image, task_type)
            
            logger.info(f"Successfully generated and uploaded image: {image_url}")
            return image_url
            
        except Exception as e:
            logger.error(f"Failed to generate task image: {e}")
            # Don't fail the task generation if image fails
            return None
    
    def _create_image_prompt(
        self,
        task_type: str,
        task_description: str,
        job_title: str
    ) -> Optional[str]:
        """
        Create an appropriate image generation prompt based on task type.
        
        Args:
            task_type: Type of task
            task_description: Description of the task
            job_title: The player's job title
        
        Returns:
            Image generation prompt, or None if task type doesn't need images
        """
        job_lower = job_title.lower()
        desc_lower = task_description.lower()
        
        # Designer tasks - UI/UX mockups and designs
        if any(keyword in job_lower for keyword in ['designer', 'ux', 'ui']):
            if 'wireframe' in desc_lower or 'mockup' in desc_lower:
                return (
                    "Professional UI/UX wireframe mockup for a modern web application, "
                    "clean design, minimalist style, grayscale with blue accents, "
                    "showing layout structure, navigation, and content areas, "
                    "professional design tool aesthetic"
                )
            elif 'design system' in desc_lower or 'component' in desc_lower:
                return (
                    "Modern design system components showcase, UI kit with buttons, "
                    "forms, cards, and navigation elements, consistent color palette, "
                    "professional design tool interface, organized grid layout"
                )
            elif 'mobile' in desc_lower or 'app' in desc_lower:
                return (
                    "Mobile app interface design mockup, modern smartphone screen, "
                    "clean UI with intuitive navigation, contemporary color scheme, "
                    "professional app design aesthetic"
                )
            else:
                return (
                    "Professional user interface design concept, modern web application, "
                    "clean and minimalist aesthetic, blue and white color scheme, "
                    "organized layout with clear visual hierarchy"
                )
        
        # Engineering tasks - architecture diagrams and flowcharts
        elif any(keyword in job_lower for keyword in ['engineer', 'developer', 'programmer']):
            if 'architecture' in desc_lower or 'system design' in desc_lower:
                return (
                    "Software architecture diagram, clean technical illustration, "
                    "showing microservices, databases, APIs, and cloud components, "
                    "modern tech stack visualization, professional diagram style, "
                    "blue and gray color scheme"
                )
            elif 'database' in desc_lower or 'data model' in desc_lower:
                return (
                    "Database schema diagram, entity relationship diagram (ERD), "
                    "tables with relationships, primary and foreign keys, "
                    "professional database design visualization, clean technical style"
                )
            elif 'workflow' in desc_lower or 'flow' in desc_lower:
                return (
                    "Software workflow flowchart, process diagram with decision points, "
                    "clean technical illustration, arrows showing data flow, "
                    "professional diagram aesthetic, blue and white color scheme"
                )
            else:
                return (
                    "Technical software development diagram, code architecture visualization, "
                    "modern tech stack components, clean professional style, "
                    "organized layout with clear connections"
                )
        
        # Analyst tasks - charts, graphs, and data visualizations
        elif any(keyword in job_lower for keyword in ['analyst', 'data', 'business intelligence']):
            if 'dashboard' in desc_lower:
                return (
                    "Professional business intelligence dashboard, multiple data "
                    "visualizations, charts and graphs, KPI metrics, modern analytics "
                    "interface, clean design with blue and green accents"
                )
            elif 'chart' in desc_lower or 'graph' in desc_lower:
                return (
                    "Professional data visualization charts, bar graphs, line charts, "
                    "pie charts showing business metrics, clean infographic style, "
                    "blue and green color palette, modern analytics aesthetic"
                )
            elif 'report' in desc_lower:
                return (
                    "Business analytics report visualization, data tables and charts, "
                    "professional presentation style, clean layout with metrics and KPIs, "
                    "corporate color scheme"
                )
            else:
                return (
                    "Data analysis visualization, professional charts and graphs, "
                    "business metrics and trends, clean infographic style, "
                    "modern analytics dashboard aesthetic"
                )
        
        # Manager tasks - strategy and planning visuals
        elif any(keyword in job_lower for keyword in ['manager', 'director', 'lead']):
            if 'strategy' in desc_lower or 'planning' in desc_lower:
                return (
                    "Business strategy planning board, roadmap visualization, "
                    "timeline with milestones, professional corporate style, "
                    "clean organized layout, blue and gray color scheme"
                )
            elif 'team' in desc_lower or 'organization' in desc_lower:
                return (
                    "Organizational chart, team structure diagram, hierarchy "
                    "visualization, professional corporate style, clean layout "
                    "with clear reporting lines"
                )
            else:
                return (
                    "Business planning visualization, project roadmap, strategic "
                    "planning board, professional corporate aesthetic, organized "
                    "layout with clear sections"
                )
        
        # Default: return None for task types that don't benefit from images
        return None
    
    def _upload_image(self, pil_image, task_type: str) -> str:
        """
        Upload generated image to Cloud Storage and return public URL.
        
        Args:
            pil_image: PIL Image object from Imagen
            task_type: Type of task (for organizing files)
        
        Returns:
            Public URL of the uploaded image
        """
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        filename = f"{task_type}/{timestamp}_{unique_id}.png"
        
        # Create blob
        blob = self.bucket.blob(filename)
        
        # Convert PIL image to bytes
        import io
        img_byte_arr = io.BytesIO()
        pil_image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        # Upload to Cloud Storage
        blob.upload_from_file(img_byte_arr, content_type='image/png')
        
        # Make the blob publicly accessible
        blob.make_public()
        
        # Return public URL
        return blob.public_url


# Global instance
_image_generator: Optional[ImageGenerator] = None


def get_image_generator() -> ImageGenerator:
    """Get or create the global ImageGenerator instance."""
    global _image_generator
    if _image_generator is None:
        _image_generator = ImageGenerator()
    return _image_generator


def generate_task_image(
    task_type: str,
    task_description: str,
    job_title: str
) -> Optional[str]:
    """
    Convenience function to generate a task image.
    
    Args:
        task_type: Type of task
        task_description: Description of the task
        job_title: The player's job title
    
    Returns:
        Public URL of the generated image, or None if generation fails
    """
    try:
        generator = get_image_generator()
        return generator.generate_task_image(task_type, task_description, job_title)
    except Exception as e:
        logger.error(f"Failed to generate task image: {e}")
        return None


__all__ = [
    "ImageGenerator",
    "ImageGenerationError",
    "get_image_generator",
    "generate_task_image",
]
