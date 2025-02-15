# server/app/api/ai_insights.py

import os
import logging
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Instantiate the client (it automatically picks up the OPENAI_API_KEY env variable)
client = OpenAI()

# Define a schema for complexity_metrics that must be adhered to.
_complexity_metrics_schema = {
    "type": "object",
    "properties": {
        "cyclomatic_complexity": {"type": ["number", "null"]},
        "halstead_metrics": {
            "type": "object",
            "properties": {
                "length": {"type": ["number", "null"]},
                "vocabulary": {"type": ["number", "null"]},
                "difficulty": {"type": ["number", "null"]},
                "volume": {"type": ["number", "null"]},
                "effort": {"type": ["number", "null"]}
            },
            "required": ["length", "vocabulary", "difficulty", "volume", "effort"],
            "additionalProperties": False
        },
        "maintainability_index": {"type": ["number", "null"]}
    },
    "required": ["cyclomatic_complexity", "halstead_metrics", "maintainability_index"],
    "additionalProperties": False
}

def analyze_code_quality(code: str) -> dict:
    """
    Analyze code quality using GPT with Structured Outputs.
    
    The analysis includes:
      - 'lines_of_code': total lines (excluding comments/blank lines if possible)
      - 'complexity_metrics': an object (with cyclomatic complexity, Halstead metrics, and maintainability index)
      - 'issues': list of identified code issues
      - 'suggestions': list of improvement suggestions
    """
    prompt = (
        "You are a code analysis expert. Analyze the following code snippet in detail. "
        "Calculate the following metrics where applicable:\n"
        "  - 'lines_of_code': total number of lines of code (excluding comments and blank lines if possible)\n"
        "  - 'complexity_metrics': an object with keys such as 'cyclomatic_complexity', "
        "    'halstead_metrics' (which includes 'length', 'vocabulary', 'difficulty', 'volume', 'effort'), "
        "    and 'maintainability_index'\n"
        "Identify any code smells, duplicated code, or potential issues, and suggest improvements. \n"
        "Return your analysis strictly as a JSON object with the following keys:\n"
        "  - 'lines_of_code'\n"
        "  - 'complexity_metrics'\n"
        "  - 'issues': a list of identified issues\n"
        "  - 'suggestions': a list of improvement suggestions\n\n"
        "Ensure that the response is valid JSON with no additional commentary.\n\n"
        f"Code:\n{code}\n\nAnalysis:"
    )
    try:
        response = client.chat.completions.create(
            model="gpt-4o-2024-08-06",  # Model that supports Structured Outputs
            messages=[
                {"role": "system", "content": "You are a code quality analysis assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=600,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "code_quality_schema",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "lines_of_code": {"type": "number"},
                            "complexity_metrics": _complexity_metrics_schema,
                            "issues": {"type": "array", "items": {"type": "string"}},
                            "suggestions": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": ["lines_of_code", "complexity_metrics", "issues", "suggestions"],
                        "additionalProperties": False
                    }
                }
            }
        )
        analysis_str = response.choices[0].message.content.strip()
        analysis_json = json.loads(analysis_str)
        return analysis_json
    except Exception as e:
        logging.error(f"OpenAI API error in analyze_code_quality: {e}")
        return {"error": str(e)}

def explain_code(code: str) -> dict:
    """
    Explain what a code snippet does using GPT with Structured Outputs.
    
    Returns a JSON object with keys:
      - 'explanation': description of the code's functionality
      - 'potential_pitfalls': list of potential issues
      - 'improvements': list of improvement suggestions
    """
    prompt = (
        "Explain what the following code does in simple terms, including its functionality and any potential pitfalls. "
        "Return your answer as a JSON object with the following keys:\n"
        "  - 'explanation': a clear description of the code's functionality\n"
        "  - 'potential_pitfalls': a list of any potential issues or pitfalls\n"
        "  - 'improvements': a list of suggestions for improvement\n\n"
        "Ensure the response is valid JSON with no extra commentary.\n\n"
        f"Code:\n{code}\n\nExplanation:"
    )
    try:
        response = client.chat.completions.create(
            model="gpt-4o-2024-08-06",
            messages=[
                {"role": "system", "content": "You are a helpful coding assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=400,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "explain_code_schema",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "explanation": {"type": "string"},
                            "potential_pitfalls": {"type": "array", "items": {"type": "string"}},
                            "improvements": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": ["explanation", "potential_pitfalls", "improvements"],
                        "additionalProperties": False
                    }
                }
            }
        )
        explanation_str = response.choices[0].message.content.strip()
        explanation_json = json.loads(explanation_str)
        return explanation_json
    except Exception as e:
        logging.error(f"OpenAI API error in explain_code: {e}")
        return {"error": str(e)}

def summarize_pr(diff: str) -> dict:
    """
    Generate a pull request summary using GPT with Structured Outputs.
    
    Returns a JSON object with keys:
      - 'key_changes': summary of main changes
      - 'potential_impacts': list of potential impacts or risks
      - 'improvement_suggestions': list of suggestions for improvement
    """
    prompt = (
        "You are an expert code reviewer. Given the following pull request diff, provide a concise summary "
        "that highlights the key changes, potential impacts, and any suggestions for improvement. "
        "Return your answer as a JSON object with the following keys:\n"
        "  - 'key_changes': a summary of the main changes made\n"
        "  - 'potential_impacts': a list of potential impacts or risks\n"
        "  - 'improvement_suggestions': a list of suggestions for improvement\n\n"
        "Ensure that the response is valid JSON with no additional commentary.\n\n"
        f"Diff:\n{diff}\n\nSummary:"
    )
    try:
        response = client.chat.completions.create(
            model="gpt-4o-2024-08-06",
            messages=[
                {"role": "system", "content": "You are an expert code reviewer and summarizer."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=400,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "summarize_pr_schema",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "key_changes": {"type": "string"},
                            "potential_impacts": {"type": "array", "items": {"type": "string"}},
                            "improvement_suggestions": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": ["key_changes", "potential_impacts", "improvement_suggestions"],
                        "additionalProperties": False
                    }
                }
            }
        )
        summary_str = response.choices[0].message.content.strip()
        summary_json = json.loads(summary_str)
        return summary_json
    except Exception as e:
        logging.error(f"OpenAI API error in summarize_pr: {e}")
        return {"error": str(e)}

def analyze_file(file_content: str) -> dict:
    MAX_FILE_LENGTH = 30000  # Maximum allowed characters (adjust as needed)
    if len(file_content) > MAX_FILE_LENGTH:
        logging.error("File too large to analyze.")
        return {"error": "File is too large to analyze."}
    
    prompt = (
        "You are a code analysis and documentation expert. Given the following code file, please perform a comprehensive analysis. "
        "Your response must be a JSON object with the following keys:\n"
        "  - 'lines_of_code': total number of lines of code (excluding comments and blank lines, if possible)\n"
        "  - 'complexity_metrics': an object that includes metrics such as 'cyclomatic_complexity', "
        "      'halstead_metrics' (with 'length', 'vocabulary', 'difficulty', 'volume', 'effort'), "
        "      and 'maintainability_index'\n"
        "  - 'issues': a list of identified issues, code smells, or duplicated code sections\n"
        "  - 'explanation': a brief explanation of the file's purpose and functionality\n"
        "  - 'suggestions': a list of suggestions for improvement\n\n"
        "Return only valid JSON with no additional commentary.\n\n"
        f"File Content:\n{file_content}\n\nAnalysis:"
    )
    try:
        response = client.chat.completions.create(
            model="gpt-4o-2024-08-06",
            messages=[
                {"role": "system", "content": "You are a code analysis and documentation assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=800,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "analyze_file_schema",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "lines_of_code": {"type": "number"},
                            "complexity_metrics": _complexity_metrics_schema,
                            "issues": {"type": "array", "items": {"type": "string"}},
                            "explanation": {"type": "string"},
                            "suggestions": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": ["lines_of_code", "complexity_metrics", "issues", "explanation", "suggestions"],
                        "additionalProperties": False
                    }
                }
            }
        )
        analysis_str = response.choices[0].message.content.strip()
        analysis_json = json.loads(analysis_str)
        return analysis_json
    except Exception as e:
        logging.error(f"OpenAI API error in analyze_file: {e}")
        return {"error": str(e)}

# For testing the functions without setting up API routes.
if __name__ == '__main__':
    sample_code = """
def add(a, b):
    # Returns the sum of a and b
    return a + b
"""
    sample_diff = """
diff --git a/calculator.py b/calculator.py
index 83db48f..bf3ff9a 100644
--- a/calculator.py
+++ b/calculator.py
@@ def add(a, b):
-    return a + b
+    result = a + b
+    print("Addition result:", result)
+    return result
"""
    sample_file = """
import math

def calculate_circle_area(radius):
    if radius < 0:
        raise ValueError("Radius cannot be negative")
    return math.pi * radius * radius

def calculate_square_area(side):
    return side * side

# Main execution
if __name__ == '__main__':
    r = 5
    s = 4
    print("Circle area:", calculate_circle_area(r))
    print("Square area:", calculate_square_area(s))
"""

    print("Testing analyze_code_quality...")
    quality_result = analyze_code_quality(sample_code)
    print(json.dumps(quality_result, indent=2))

    print("\nTesting explain_code...")
    explain_result = explain_code(sample_code)
    print(json.dumps(explain_result, indent=2))

    print("\nTesting summarize_pr...")
    pr_result = summarize_pr(sample_diff)
    print(json.dumps(pr_result, indent=2))

    print("\nTesting analyze_file...")
    file_result = analyze_file(sample_file)
    print(json.dumps(file_result, indent=2))
