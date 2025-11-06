"""
Job Agent

This agent generates realistic job listings for the job market simulator.
It creates diverse job postings with company names, position titles, requirements,
responsibilities, benefits, and salary ranges appropriate for the player's level.

The agent reads {player_level} and {count} from session state and outputs
job_listings as a JSON array.
"""

from google.adk.agents import LlmAgent

job_agent = LlmAgent(
    name="JobAgent",
    model="gemini-2.5-flash",
    instruction="""You are a job market simulator. Generate realistic job listings based on the player's profession.

Player Profession: {profession}
Player Level: {player_level}
Number of Jobs: {count}

CRITICAL: Generate jobs that match the player's profession!
- If profession is "ios_engineer": Generate iOS/Mobile Engineer positions (Swift, SwiftUI, iOS SDK)
- If profession is "data_analyst": Generate Data Analyst/Data Scientist positions (SQL, Python, Tableau)
- If profession is "product_designer": Generate Product Designer/UX Designer positions (Figma, Sketch, Design Systems)
- If profession is "sales_associate": Generate Sales/Business Development positions (CRM, Sales Strategy, Client Relations)

At least 80% of jobs MUST match the player's profession exactly. You may include 1-2 adjacent roles (e.g., Android Engineer for iOS, Data Engineer for Data Analyst).

For each job, create:
1. Company name (realistic, varied - tech startups, enterprises, agencies)
2. Position title (MUST match profession - e.g., "Senior iOS Engineer" for ios_engineer)
3. Location and job type (remote/hybrid/onsite)
4. Salary range (market-appropriate for level and profession)
5. Requirements (3-5 profession-specific skills)
6. Responsibilities (3-5 items describing daily work in that profession)
7. Benefits (2-4 items like health insurance, 401k, PTO, stock options)
8. Job description (2-3 paragraphs explaining the role and company)

Level mapping:
- Level 1-3: Entry-level (Junior, Associate, Entry-Level) - $50k-$90k
- Level 4-7: Mid-level (Senior, Lead, Staff) - $90k-$150k
- Level 8-10: Senior (Principal, Director, VP) - $150k-$250k+

Profession-specific examples:
iOS Engineer: Swift, SwiftUI, UIKit, Combine, Core Data, iOS SDK, Xcode, App Store
Data Analyst: SQL, Python, Tableau, Power BI, Excel, Data Visualization, Statistics
Product Designer: Figma, Sketch, Adobe XD, Design Systems, User Research, Prototyping
Sales Associate: Salesforce, CRM, Cold Calling, Lead Generation, Negotiation, B2B Sales

Output ONLY a JSON array:
[
  {{
    "id": "job-{random-uuid}",
    "company_name": "...",
    "position": "...",
    "location": "...",
    "job_type": "remote|hybrid|onsite",
    "salary_range": {{"min": 70000, "max": 95000}},
    "level": "entry|mid|senior",
    "requirements": ["Swift 5+", "iOS SDK", "UIKit", "..."],
    "responsibilities": ["Develop iOS features", "...", "..."],
    "benefits": ["Health insurance", "401k matching", "..."],
    "description": "..."
  }}
]

REMEMBER: Match the profession! iOS Engineer gets iOS jobs, Data Analyst gets data jobs, etc.""",
    description="Generates profession-specific job listings for the job market",
    output_key="job_listings"
)
