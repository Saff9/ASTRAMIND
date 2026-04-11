# ASTRAMIND Skills & Config

---

## 🎯 SKILLS CONFIGURATION

### Enable/Disable Skills

```yaml
skills:
  # Conversation - basic chatting
  conversation:
    enabled: true
    priority: 1

  # Code - programming help
  code:
    enabled: true
    priority: 1

  # Web Search - search the internet
  web_search:
    enabled: true
    priority: 2

  # Writing - emails, docs, creative
  writing:
    enabled: true
    priority: 1

  # Analysis - problem solving
  analysis:
    enabled: true
    priority: 1

  # Creative - brainstorming, ideas
  creative:
    enabled: true
    priority: 1
```

---

## 🔧 HOW SKILLS WORK

### Priority System
- **Priority 1**: Core skills - always available
- **Priority 2**: Additional skills - can be triggered
- **Priority 3**: Optional skills - on-demand

### Skill Triggers
ASTRAMIND automatically uses skills based on what you ask:

| You say... | Skill used |
|------------|-----------|
| "write code" | code |
| "search for" | web_search |
| "write an email" | writing |
| "what do you think" | analysis |
| "brainstorm" | creative |
| anything else | conversation |

---

## 📝 CODE SETTINGS

```yaml
code:
  # Languages to help with
  languages:
    - python
    - javascript
    - typescript
    - go
    - rust
    - java
    - c++
    - html
    - css
    - sql

  # Code style preference
  style: "modern"  # modern, classic, concise

  # Add comments to code?
  add_comments: true

  # Explain code after writing?
  explain_code: true
  
  # Handle errors?
  debug_errors: true
```

---

## 🌐 WEB SEARCH SETTINGS

```yaml
web_search:
  enabled: true
  
  # Max results to return
  max_results: 5
  
  # Timeout in seconds
  timeout: 10
  
  # Preferred sources (optional)
  # sources:
  #   - wikipedia
  #   - github
  #   - stackoverflow
  
  # Enable for factual questions?
  auto_search_facts: true
```

---

## ✍️ WRITING SETTINGS

```yaml
writing:
  # Types of writing to help with
  types:
    emails: true
    messages: true
    documents: true
    creative: true
    technical: true
  
  # Default tone
  default_tone: "professional"  # professional, casual, friendly
  
  # Grammar check?
  fix_grammar: true
  
  # Make concise?
  conciseness: "balanced"  # brief, balanced, detailed
```

---

## 🧠 ANALYSIS SETTINGS

```yaml
analysis:
  # How detailed to be
  depth: "balanced"  # quick, balanced, deep
  
  # Show pros and cons?
  pros_cons: true
  
  # Give examples?
  examples: true
  
  # Suggest next steps?
  recommendations: true
```

---

## 🎨 CREATIVE SETTINGS

```yaml
creative:
  # How creative to be (0.0 to 1.0)
  creativity_level: 0.8
  
  # Types of creative work
  types:
    stories: true
    poems: true
    ideas: true
    jokes: true
    marketing: true
  
  # Match user's creativity level?
  adapt_to_user: true
```

---

## 😎 MEME & FUN SETTINGS

```yaml
fun:
  # Use internet slang?
  slang_enabled: true
  
  # How often slang (0.0 to 1.0)
  slang_frequency: 0.7
  
  # Use emojis?
  emoji_enabled: true
  
  # How many emojis (0.0 to 1.0)
  emoji_frequency: 0.8
  
  # Make jokes?
  jokes_enabled: true
  
  # How often jokes (0.0 to 1.0)
  joke_frequency: 0.3
  
  # Be playful?
  playful: true
```

---

## 📏 RESPONSE LIMITS

```yaml
limits:
  # Max characters per response
  max_response_length: 2000
  
  # Max code lines to write
  max_code_lines: 200
  
  # Max web results
  max_search_results: 5
  
  # Timeout for responses (seconds)
  response_timeout: 30
```

---

## 🚫 RESTRICTIONS

```yaml
restrictions:
  # Block harmful content?
  block_harmful: true
  
  # Block illegal stuff?
  block_illegal: true
  
  # Block adult content?
  block_adult: false  # Set true to block
  
  # Block personal info sharing?
  block_pii: true
  
  # Say "I don't know" for uncertain?
  honesty_mode: true
```

---

## 🔄 QUICK ON/OFF

Want to quickly change ASTRAMIND?

### More Professional
```yaml
fun:
  slang_frequency: 0.1
  emoji_frequency: 0.2
  joke_frequency: 0.1

writing:
  default_tone: "professional"
```

### More Fun/Casual
```yaml
fun:
  slang_frequency: 0.9
  emoji_frequency: 1.0
  joke_frequency: 0.6

writing:
  default_tone: "casual"
```

### More Technical
```yaml
code:
  add_comments: true
  explain_code: true

analysis:
  depth: "deep"
  
writing:
  conciseness: "detailed"
```

---

## 💾 HOW TO USE THIS FILE

1. Copy this file to your config folder
2. Change settings as needed
3. Point to it with: `PERSONALITY_CONFIG_PATH=./my_config.yaml`
4. Or use a preset: `PERSONALITY_PROFILE=professional`

See `PERSONALITY.md` for the plain-English persona description.

---

*Change these settings to customize how ASTRAMIND helps you!*