# Playbooq.AI API Documentation

## Claude API Route: `/api/generate-playbook`

### Overview
This API endpoint powers the AI-driven playbook generation using Anthropic's Claude Sonnet model. It creates comprehensive, actionable playbooks from user inputs and uploaded documents.

### Authentication
- **Required**: Clerk authentication
- **Rate Limit**: 20 playbook generations per hour per user
- **Security**: Input sanitization with DOMPurify

### Request Format

#### POST `/api/generate-playbook`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <clerk-token>
```

**Request Body:**
```typescript
{
  topic: string                    // Required: Main topic/theme
  documents?: string[]            // Optional: Extracted text from files
  existingContent?: string        // Optional: Existing playbook content
  regenerateSection?: {           // Optional: For regenerating specific sections
    sectionId: string
    sectionTitle: string
  }
}
```

### Response Format

**Success Response (200):**
```typescript
{
  title: string                   // Generated playbook title
  summary: string                 // Executive summary
  content: object                 // Tiptap JSON format
  sections: Array<{               // Parsed sections with metadata
    id: string
    title: string
    level: number
    content: string
  }>
  rawMarkdown: string             // Original markdown from Claude
  usage: {                        // Token usage statistics
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
}
```

**Error Responses:**
- `400`: Invalid request (missing topic, malformed data)
- `401`: Authentication required
- `429`: Rate limit exceeded
- `500`: Server error (API key issues, Claude API errors)

### Supported File Types

The API can process text extracted from various file formats:

#### Document Formats
- **PDF** (`.pdf`) - Using `pdf-parse`
- **Word Documents** (`.docx`) - Using `mammoth`
- **Plain Text** (`.txt`) - Native support

#### Data Formats
- **CSV** (`.csv`) - Using `papaparse`
- **Markdown** (`.md`) - Native support
- **JSON** (`.json`) - Native support

#### Code/Text Formats
- Any text-based file (`.js`, `.ts`, `.py`, `.html`, `.css`, etc.)

### Claude Configuration

- **Model**: `claude-3-5-sonnet-20241022`
- **Max Tokens**: 8,000 (supports up to 16k)
- **Temperature**: 1.0 (creative and diverse output)
- **System Prompt**: Expert playbook creator with specific formatting requirements

### Key Features

#### 1. Content Enhancement
- **Existing Content**: When `existingContent` is provided, Claude enhances rather than replaces
- **Merging**: Redundant content is intelligently merged
- **Consistency**: Maintains tone and structure throughout

#### 2. Structured Output
- **Hierarchical Headings**: H1, H2, H3 structure
- **Actionable Steps**: Each step includes tools and rationale
- **Best Practices**: Common pitfalls and pro tips included

#### 3. Rate Limiting
- **Per-User Limits**: 20 generations per hour
- **Automatic Reset**: Hourly reset for fair usage
- **Clear Error Messages**: User-friendly rate limit notifications

#### 4. Security
- **Input Sanitization**: All inputs cleaned with DOMPurify
- **Authentication**: Clerk-based user verification
- **API Key Protection**: Never exposed to client

### Usage Examples

#### Basic Playbook Generation
```javascript
const response = await fetch('/api/generate-playbook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: "Digital Marketing Strategy for SaaS Startups"
  })
})
```

#### With Document Upload
```javascript
const response = await fetch('/api/generate-playbook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: "Employee Onboarding Process",
    documents: [
      "Existing onboarding checklist...",
      "HR policy document content..."
    ]
  })
})
```

#### Content Enhancement
```javascript
const response = await fetch('/api/generate-playbook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    topic: "Advanced Marketing Strategies",
    existingContent: "# Basic Marketing\n\n1. Create social media accounts...",
    documents: ["Advanced marketing research..."]
  })
})
```

### Error Handling

#### Common Error Scenarios
1. **Authentication**: User not logged in
2. **Rate Limiting**: Too many requests
3. **Invalid Input**: Missing topic or malformed data
4. **Claude API Issues**: Rate limits, invalid key, model errors
5. **File Processing**: Unsupported file types or corrupted files

#### Error Response Format
```typescript
{
  error: string    // User-friendly error message
  details?: string // Additional context (development only)
}
```

### Performance Considerations

#### Token Usage
- **Input Tokens**: Based on prompt length (topic + documents + existing content)
- **Output Tokens**: Typically 2,000-6,000 for comprehensive playbooks
- **Cost Estimation**: ~$0.01-0.05 per playbook generation

#### Response Time
- **Typical**: 3-8 seconds for complete playbook
- **Large Documents**: 10-15 seconds with extensive content
- **Timeout**: 30-second limit for API calls

### Development Notes

#### File Processing Pipeline
1. **Upload**: Files received via `react-dropzone`
2. **Extraction**: Text extracted using appropriate libraries
3. **Sanitization**: Content cleaned with DOMPurify
4. **Claude Processing**: Enhanced content sent to Claude
5. **Response Parsing**: Markdown converted to Tiptap JSON

#### Rate Limiting Implementation
- **In-Memory Storage**: Uses Map for development
- **Production Recommendation**: Redis or database storage
- **User Identification**: Based on Clerk user ID

#### Monitoring
- **Token Usage**: Tracked per request
- **Error Rates**: Logged for debugging
- **Performance**: Response time monitoring recommended

### Future Enhancements

#### Planned Features
1. **Streaming Responses**: Real-time playbook generation
2. **Custom Templates**: Industry-specific playbook formats
3. **Collaborative Editing**: Multiple users working on playbooks
4. **Version Control**: Track playbook iterations
5. **Export Options**: PDF, Word, and other formats

#### Technical Improvements
1. **Caching**: Redis-based response caching
2. **Queue System**: Background processing for large requests
3. **Analytics**: Usage tracking and optimization
4. **Webhooks**: Real-time notifications for long-running tasks

### Security Best Practices

#### Input Validation
- **Sanitization**: All text inputs cleaned
- **File Type Validation**: Only supported formats accepted
- **Size Limits**: Reasonable file size restrictions

#### API Security
- **Authentication**: Clerk-based user verification
- **Rate Limiting**: Prevents abuse and manages costs
- **Error Handling**: No sensitive information in error messages

#### Data Privacy
- **Temporary Storage**: Rate limit data only
- **No Persistence**: Generated content not stored server-side
- **User Control**: Users manage their own generated content
