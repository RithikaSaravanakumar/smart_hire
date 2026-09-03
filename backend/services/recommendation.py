import re
from typing import List, Set, Dict, Any

def normalize_skills(skills_input: Any) -> Set[str]:
    """
    Normalizes skills from string (comma/semicolon/newline separated) or list into a clean lowercase set.
    Handles extra whitespace, punctuation, and deduplication.
    """
    if not skills_input:
        return set()

    if isinstance(skills_input, list):
        items = skills_input
    elif isinstance(skills_input, str):
        # Split by comma, semicolon, pipe, slash, or newline
        items = re.split(r'[,;|\n/]+', skills_input)
    else:
        return set()

    normalized = set()
    for item in items:
        cleaned = str(item).strip().lower()
        # Remove unwanted trailing punctuation like periods or brackets
        cleaned = re.sub(r'^[^\w+#.-]+|[^\w+#.-]+$', '', cleaned)
        if cleaned:
            normalized.add(cleaned)
    return normalized

def calculate_skill_match(student_skills: Any, job_skills: Any) -> Dict[str, Any]:
    """
    Calculate the skill match percentage and classification between a student's skills and a job's required skills.
    
    Formula:
        (Number of matching skills / Total required job skills) * 100
        
    Classification:
        80% - 100% -> Highly Recommended
        60% - 79.9% -> Recommended
        40% - 59.9% -> Potential Match
        0% - 39.9%  -> Low Match
    """
    student_set = normalize_skills(student_skills)
    job_set = normalize_skills(job_skills)

    if not job_set:
        # If job specifies no requirements, default to 100% match
        return {
            'match_percentage': 100.0,
            'category': 'Highly Recommended',
            'matching_skills': sorted(list(student_set)),
            'missing_skills': [],
            'total_required': 0,
            'total_matched': len(student_set)
        }

    matching = student_set.intersection(job_set)
    missing = job_set - student_set

    match_pct = round((len(matching) / len(job_set)) * 100.0, 2)

    if match_pct >= 80.0:
        category = 'Highly Recommended'
    elif match_pct >= 60.0:
        category = 'Recommended'
    elif match_pct >= 40.0:
        category = 'Potential Match'
    else:
        category = 'Low Match'

    return {
        'match_percentage': match_pct,
        'category': category,
        'matching_skills': sorted(list(matching)),
        'missing_skills': sorted(list(missing)),
        'total_required': len(job_set),
        'total_matched': len(matching)
    }

def rank_jobs_for_student(student_skills: Any, jobs: List[Any], limit: int = None) -> List[Dict[str, Any]]:
    """
    Takes a list of Job model instances or dicts and ranks them by highest skill match percentage.
    """
    ranked_jobs = []
    for job in jobs:
        job_data = job.to_dict() if hasattr(job, 'to_dict') else dict(job)
        match_result = calculate_skill_match(student_skills, job_data.get('skills', ''))
        
        job_with_match = {
            **job_data,
            'skill_match': match_result
        }
        ranked_jobs.append(job_with_match)

    # Sort descending by match_percentage, then by created_at or job_id
    ranked_jobs.sort(key=lambda x: (x['skill_match']['match_percentage'], x.get('job_id', 0)), reverse=True)

    if limit and limit > 0:
        return ranked_jobs[:limit]
    return ranked_jobs
