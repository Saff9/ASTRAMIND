"""
Advanced ASTRAMIND Personality Engine v2.0

Multi-dimensional personality system that creates truly unique AI responses
with cultural authenticity, emotional intelligence, and adaptive behavior.

Features:
- Dynamic personality switching
- Cultural context awareness
- Emotional intelligence modeling
- Contextual tone adaptation
- Personality consistency maintenance
- Creative expression generation
"""

from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
from dataclasses import dataclass
from datetime import datetime
import random
import hashlib
from functools import lru_cache


class PersonalityTraits(Enum):
    """Core personality dimensions"""
    HUMOR = "humor"  # Serious -> Hilarious
    FORMALITY = "formality"  # Very formal -> Very casual
    ENERGY = "energy"  # Chill -> Hype
    CREATIVITY = "creativity"  # Practical -> Abstract
    EMPATHY = "empathy"  # Detached -> Deeply caring


@dataclass
class PersonalityState:
    """User's current personality preferences"""
    user_id: str
    conversation_id: str
    humor_level: float = 0.7  # 0-1 scale
    formality_level: float = 0.3  # 0 = casual, 1 = formal
    energy_level: float = 0.6  # 0-1 scale
    creativity_level: float = 0.8  # 0-1 scale
    empathy_level: float = 0.7  # 0-1 scale
    dominant_mood: str = "neutral"  # happy, angry, sad, excited, curious
    conversation_topic: str = "general"


class CulturalContextAwareness:
    """
    Understand and respond appropriately to cultural references,
    slang, and context-specific communication styles
    """
    
    ASTRAMIND_SLANG_DATABASE = {
        "approval": [
            "no cap", "fr fr", "deadass", "on god", "bet",
            "slay", "ate", "went off", "iconic", "period"
        ],
        "disapproval": [
            "mid", "cringe", "ain't it", "weak", "trash",
            "yikes", "not giving", "not the vibe", "sus", "toxic"
        ],
        "excitement": [
            "let's go", "yessir", "fire", "bussin", "slaps",
            "hits different", "that's crazy", "no way", "wild", "unhinged"
        ],
        "acknowledgment": [
            "fr", "ngl", "lowkey", "highkey", "tbh", "imo",
            "facts", "real shit", "word", "ong"
        ],
        "disagreement": [
            "not me", "not the way", "hold up", "cap", "that's wild",
            "different", "don't agree", "nah fr", "that ain't it"
        ]
    }
    
    ASTRAMIND_REFERENCES = {
        "pop_culture": [
            "It's giving...", "The way...", "Bestie, I'm...",
            "Living my best life", "Rent-free", "Main character energy",
            "Touch grass", "That's a vibe", "No thoughts, head empty"
        ],
        "emotions": [
            "I'm feeling some type of way", "Emotional damage",
            "My heart just did a backflip", "Caught in 4K",
            "Standing on business", "My bad fr fr"
        ],
        "irony": [
            "Clearly I'm insane", "Not me analyzing this",
            "Should've been a therapist", "Living in delusion",
            "The audacity", "This is giving unhinged"
        ]
    }
    
    @staticmethod
    def analyze_user_communication_style(message: str) -> Dict[str, float]:
        """
        Analyze user's communication style to adapt personality
        
        Returns: Style scores (0-1) for different dimensions
        """
        message_lower = message.lower()
        
        formality_indicators = {
            "formal": ["furthermore", "moreover", "thus", "regarding"],
            "casual": ["like", "lol", "omg", "btw", "imo"]
        }
        
        formality_score = 0.5
        if any(word in message_lower for word in formality_indicators["formal"]):
            formality_score += 0.3
        if any(word in message_lower for word in formality_indicators["casual"]):
            formality_score -= 0.2
        
        return {
            "formality": min(1, max(0, formality_score)),
            "energy": 0.5 + (message.count("!") * 0.05),
            "creativity": 0.7 if len(message) > 100 else 0.5,
        }
    
    @classmethod
    def get_contextual_slang(cls, context: str, count: int = 3) -> List[str]:
        """Get appropriate slang for context"""
        category = context.lower()
        if category not in cls.ASTRAMIND_SLANG_DATABASE:
            category = "acknowledgment"
        
        return random.sample(
            cls.ASTRAMIND_SLANG_DATABASE[category],
            min(count, len(cls.ASTRAMIND_SLANG_DATABASE[category]))
        )


class EmotionalIntelligenceEngine:
    """
    Model emotional awareness and appropriate responses
    """
    
    EMOTIONAL_STATES = {
        "happy": {
            "indicators": ["excited", "love", "great", "amazing", "best"],
            "response_tone": "celebratory",
            "emoji_usage": "high",
            "exclamation_rate": 0.8,
        },
        "frustrated": {
            "indicators": ["frustrating", "angry", "hate", "worst", "bad"],
            "response_tone": "validating",
            "emoji_usage": "medium",
            "exclamation_rate": 0.3,
        },
        "curious": {
            "indicators": ["why", "how", "what", "wonder", "question"],
            "response_tone": "exploratory",
            "emoji_usage": "low",
            "exclamation_rate": 0.4,
        },
        "sad": {
            "indicators": ["sad", "unhappy", "depressed", "lonely", "terrible"],
            "response_tone": "empathetic",
            "emoji_usage": "medium",
            "exclamation_rate": 0.1,
        },
        "anxious": {
            "indicators": ["worried", "anxious", "nervous", "scared", "overwhelmed"],
            "response_tone": "reassuring",
            "emoji_usage": "medium",
            "exclamation_rate": 0.2,
        },
    }
    
    @staticmethod
    def detect_emotional_state(message: str) -> Tuple[str, float]:
        """
        Detect emotional state from message
        
        Returns: (emotion, confidence)
        """
        message_lower = message.lower()
        
        for emotion, config in EmotionalIntelligenceEngine.EMOTIONAL_STATES.items():
            matches = sum(
                message_lower.count(indicator)
                for indicator in config["indicators"]
            )
            if matches > 0:
                confidence = min(1.0, matches * 0.3)
                return emotion, confidence
        
        return "neutral", 0.0
    
    @staticmethod
    def adapt_response_to_emotion(
        base_response: str,
        emotion: str,
        config: Dict[str, Any]
    ) -> str:
        """Adapt response based on detected emotion"""
        
        if emotion == "sad":
            # Add validating opening
            return f"I hear you. {base_response}"
        elif emotion == "frustrated":
            # Acknowledge frustration
            return f"That sounds really frustrating. {base_response}"
        elif emotion == "happy":
            # Amplify positivity
            return f"That's amazing! {base_response}! 🔥"
        elif emotion == "anxious":
            # Be reassuring
            return f"You've got this. {base_response}"
        
        return base_response


class PersonalityConsistencyManager:
    """
    Maintain personality consistency across conversations
    Store and apply learned personality preferences
    """
    
    def __init__(self):
        self.user_personalities: Dict[str, PersonalityState] = {}
        self.conversation_context: Dict[str, List[Dict]] = {}
    
    def learn_personality(
        self,
        user_id: str,
        conversation_id: str,
        interaction_data: Dict[str, Any]
    ) -> PersonalityState:
        """
        Learn from user interactions and adapt personality
        """
        key = f"{user_id}:{conversation_id}"
        
        if key not in self.user_personalities:
            self.user_personalities[key] = PersonalityState(
                user_id=user_id,
                conversation_id=conversation_id
            )
        
        state = self.user_personalities[key]
        
        # Adapt based on feedback
        if interaction_data.get("user_liked_response"):
            state.humor_level = min(1, state.humor_level + 0.05)
            state.energy_level = min(1, state.energy_level + 0.05)
        
        if interaction_data.get("user_preferred_formal"):
            state.formality_level = min(1, state.formality_level + 0.1)
        
        return state
    
    def get_personality(
        self,
        user_id: str,
        conversation_id: str
    ) -> PersonalityState:
        """Get learned personality for user"""
        key = f"{user_id}:{conversation_id}"
        if key not in self.user_personalities:
            self.user_personalities[key] = PersonalityState(
                user_id=user_id,
                conversation_id=conversation_id
            )
        return self.user_personalities[key]


class CreativeExpressionGenerator:
    """Generate creative, unique responses using personality traits"""
    
    CREATIVE_TEMPLATES = {
        "analogy": "It's like {comparison} - {explanation}",
        "metaphor": "{concept} is actually {metaphor}",
        "wordplay": "{pun} (see what I did there?)",
        "storytelling": "So this one time, {story}...",
        "question": "But have you considered {twist}?",
        "observation": "No one talks about {insight}",
        "perspective": "Here's the thing - {take}",
    }
    
    @staticmethod
    def inject_personality(
        response: str,
        personality: PersonalityState,
        culture: CulturalContextAwareness
    ) -> str:
        """
        Inject personality traits into response
        """
        
        # Add slang if high energy/creativity
        if personality.energy_level > 0.7:
            slang = culture.get_contextual_slang("approval", count=1)[0]
            response = f"{response} (no cap, {slang})"
        
        # Add emojis if high energy
        if personality.energy_level > 0.8:
            emojis = ["🔥", "💯", "✨", "🎯", "🚀"]
            response = f"{response} {random.choice(emojis)}"
        
        # Add humor if high humor level
        if personality.humor_level > 0.7:
            humor_additions = [
                "lmao",
                "bestie",
                "it's giving...",
                "main character energy",
            ]
            if random.random() > 0.5:
                response = f"{response} {random.choice(humor_additions)}"
        
        return response


class AdaptivePersonalityEngine:
    """
    Master engine combining all personality components
    """
    
    def __init__(self):
        self.cultural_awareness = CulturalContextAwareness()
        self.emotional_intelligence = EmotionalIntelligenceEngine()
        self.consistency_manager = PersonalityConsistencyManager()
        self.creative_generator = CreativeExpressionGenerator()
    
    def adapt_response(
        self,
        user_id: str,
        conversation_id: str,
        base_response: str,
        user_message: str,
        feedback: Optional[Dict] = None
    ) -> str:
        """
        Adapt response using all personality dimensions
        """
        
        # Get or learn personality
        personality = self.consistency_manager.get_personality(
            user_id,
            conversation_id
        )
        
        # Analyze user's communication style
        user_style = self.cultural_awareness.analyze_user_communication_style(
            user_message
        )
        personality.formality_level = user_style.get("formality", 0.5)
        
        # Detect emotional state
        emotion, confidence = self.emotional_intelligence.detect_emotional_state(
            user_message
        )
        personality.dominant_mood = emotion
        
        # Adapt response to emotion
        adapted = self.emotional_intelligence.adapt_response_to_emotion(
            base_response,
            emotion,
            {}
        )
        
        # Inject personality traits
        final_response = self.creative_generator.inject_personality(
            adapted,
            personality,
            self.cultural_awareness
        )
        
        # Learn from feedback if provided
        if feedback:
            self.consistency_manager.learn_personality(
                user_id,
                conversation_id,
                feedback
            )
        
        return final_response
    
    def get_system_prompt(self, personality: PersonalityState) -> str:
        """Generate system prompt based on personality"""
        
        tone = "casual" if personality.formality_level < 0.5 else "professional"
        energy = "energetic" if personality.energy_level > 0.7 else "thoughtful"
        
        return f"""You are a ASTRAMIND assistant with these traits:
- Communication style: {tone}
- Energy level: {energy}
- Humor level: {personality.humor_level * 100:.0f}%
- Empathy level: {personality.empathy_level * 100:.0f}%
- Current mood: {personality.dominant_mood}

Adapt your responses to match these personality traits while being helpful and accurate."""


# Global instance
personality_engine = AdaptivePersonalityEngine()


def create_unique_response(
    user_id: str,
    conversation_id: str,
    base_response: str,
    user_message: str,
    feedback: Optional[Dict] = None
) -> str:
    """
    Main function to create personality-adapted response
    
    Usage:
        response = create_unique_response(
            user_id="user123",
            conversation_id="conv456",
            base_response="Here's the answer to your question...",
            user_message="Why is the sky blue?",
            feedback={"user_liked_response": True}
        )
    """
    return personality_engine.adapt_response(
        user_id,
        conversation_id,
        base_response,
        user_message,
        feedback
    )
