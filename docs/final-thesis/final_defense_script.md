# Final Defense Script - SkillForge: Development of Interactive Game Hub for Improved Student Engagement and Learning

**Presenters:** Dela Torre, Zyryll Jay L. | Fernandez, Michael G. | Guban, Mark Gian M.
**Adviser:** Adrian Andrew M. Balita | BS Computer Science, 2026
**Our Lady of Assumption College of Laguna, Inc.**

> Practice notes: read each `[Speaker]` block in full sentences, at a natural pace. `(Advance slide...)` lines are stage directions, not spoken. This is a full run from Chapter 1 to Chapter 5 - Chapters 1-3 are kept short since the panel already approved this content at the first defense; Chapters 4-5 carry the bulk of the time because that is where the actual system, findings, and evaluation live. Key numbers to memorize: **108 respondents | overall 4.00 | Usability highest 4.06 | Reliability lowest 3.90 | 3.7-4.5 = Agree / Acceptable.**

---

## Opening

**[Dela Torre]**
Good day, respected panelists. We are Dela Torre, Fernandez, and Guban, fourth-year BS Computer Science students, and today we present our final defense for our thesis, "Development of Interactive Game Hub for Improved Student Engagement and Learning," under the guidance of our adviser, Mr. Adrian Andrew M. Balita.

(Advance slide - Presentation Agenda)

**[Fernandez]**
In our first defense, we presented Chapters 1 to 3 as a concept - the problem we wanted to solve, the related literature that supported our approach, and the framework we planned to follow. Today, for our final defense, we will walk through the whole study from Chapter 1 to Chapter 5, but this time we are presenting SkillForge as a completed and evaluated system - including the results of our ISO 25010 evaluation with one hundred eight respondents. We will move quickly through the first three chapters as a recap, then spend most of our time on Chapter 4, our results, and Chapter 5, our conclusions and recommendations.

---

## Chapter 1 - Introduction
**[Speaker: Dela Torre]**

(Advance slide - Chapter 1: Introduction)

(Advance slide - Project Context)

Let me begin with our Project Context. In today's digital age, traditional teaching methods are often no longer enough to hold students' attention. Learners who grew up with smartphones, video games, and social media now expect interactivity and instant feedback from every experience - including learning. This is the engagement gap.

Locally, Our Lady of Assumption College faces this exact challenge: growing difficulty keeping students engaged in subjects such as Math, Science, English, and Literature, because classroom instruction has not kept pace with the interactive technologies students use every day.

The good news is that there is a proven approach. Gamification - the use of challenges, points, rewards, and instant feedback - has been shown in both local and international studies to boost student motivation, participation, and learning outcomes.

Our response is SkillForge: a centralized, web-based game hub that aligns curriculum content with gamified learning, letting students track their progress, earn rewards, and learn in a fun, interactive, and personalized way.

(Advance slide - Purpose and Description)

For our Purpose and Description: our main goal was to design and develop SkillForge, a web-based educational game hub that boosts student engagement and learning outcomes by transforming ordinary lessons into interactive, game-based experiences.

It serves the Senior High School students of Our Lady of Assumption College, accessible anytime on both computers and mobile devices, whether in school or at home. It offers curriculum-based games in Math, Science, English, and Literature; gamified features such as points, levels, badges, and leaderboards; and real-time analytics that guide both student learning and teacher instruction. And importantly, its role is to complement traditional education - enriching classroom instruction with a richer, more motivating learning environment, not replacing it.

(Advance slide - Objectives of the Study)

Our main objective was to design and develop an interactive educational game hub aligned with the curriculum of Our Lady of Assumption College, improving student engagement and learning outcomes through gamification. Specifically, the study aimed to:

First, create curriculum-based game modules across key subjects - Mathematics, Science, English, and Literature - that teach and reinforce lesson content.

Second, integrate gamification elements - points, levels, badges, and leaderboards - that motivate students to participate actively and continuously improve.

Third, implement a learning analytics system that tracks student performance, identifies learning patterns and trends, and delivers meaningful insights.

Fourth, provide real-time feedback and personalized recommendations based on each student's individual performance data.

And fifth, support teachers with dashboards that guide instruction and identify learners or topics needing intervention.

(Advance slide - Scope and Limitations)

In terms of Scope, SkillForge covers selected Senior High School subjects - Mathematics, Science, English, and Literature - and is accessible through web browsers on desktops, laptops, and mobile devices. It provides user logins, curriculum-based games, student progress tracking, and analytics dashboards for teachers. It is built with modern web technologies, designed for compatibility with the school's existing infrastructure, and intended as a supplementary learning tool that supports classroom teaching.

As for Limitations: it does not replace classroom teaching or the school's official grading systems; the initial rollout is limited to selected grade levels only; it requires internet access and compatible devices for full functionality; and post-launch maintenance and system updates depend on the school's IT support.

---

## Chapter 2 - Related Literature and Studies
**[Speaker: Dela Torre]**

(Advance slide - Chapter 2: Related Literature and Studies)

(Advance slide - Local Studies and Literature)

To briefly recap our review of related literature, starting with the local evidence. Dela Cruz, in a 2023 local study, explored gamification in an online physics laboratory class for engineering students during pandemic-era remote learning. Leaderboards, coins, and level ranks were introduced in two test classes and assessed through a mixed-methods design - tests, surveys, learning logs, and focus groups. The result: students became more motivated and self-regulated, achieved better academic results, and gave positive feedback on the interactive experience.

For local literature, Bagsic, in 2023, conducted a quasi-experimental study on localized, gamified learning materials for Grade 11 Practical Research 1. One group received traditional instruction while another used gamified supplementary materials - and the gamified group scored significantly higher in both formative assessments and posttests, confirming the positive impact of game-based resources on learning outcomes.

The takeaway is clear: Philippine classrooms respond strongly to gamified mechanics - which validates SkillForge's approach as a curriculum-aligned academic supplement.

(Advance slide - Foreign Studies and Literature)

On the foreign side, Darad's 2025 study examined how gamification transforms both education and corporate training. Integrating points, badges, leaderboards, and challenges led to higher completion rates and more active learning. Recognition through rewards and progress tracking strengthens both intrinsic and extrinsic motivation, while AI-powered tools enable real-time, personalized feedback for each learner.

For foreign literature, Temel and Cesur, in 2024, ran a mixed-methods study of gamified Web 2.0 tools - Kahoot!, Socrative, Quizizz, and Mentimeter - with students learning English as a Foreign Language in online settings. The interactive, game-based platforms significantly increased motivation and academic performance, supporting quiz mechanics, leaderboards, and achievements as effective digital learning tools.

Our full manuscript reviews additional local and foreign studies - including Medico and colleagues, Villacarlos and colleagues, Aznar-Diaz and colleagues, and Soler-Dominguez and colleagues - and the synthesis is consistent: local and foreign evidence converge. Gamified, curriculum-aligned platforms improve engagement and outcomes, and SkillForge applies that evidence here at OLAC.

---

## Chapter 3 - Operational Framework
**[Speaker: Fernandez]**

Thank you. I will now discuss Chapter 3, our Operational Framework - how we actually built and evaluated SkillForge.

(Advance slide - Methodology: SDLC and Technology Stack)

Our study followed developmental research using the six-phase Software Development Life Cycle, based on the Boyce model: requirements, design, coding, testing, deployment, and maintenance. This gave us a structured but iterative process, letting us refine game mechanics, interface design, and educational content based on real stakeholder feedback throughout development.

For our technology stack: the frontend is built with React.js and Tailwind, on a foundation of HTML, CSS, and JavaScript; the backend uses Node.js with Express.js for server-side logic; data is stored in PostgreSQL; and the application is served through Next.js as our web server. Testing covered four levels - unit, integration, system, and acceptance - and evaluation used the ISO 25010 software quality model with one hundred eight respondents on a 5-point Likert scale, where weighted means from 3.7 to 4.5 are interpreted as Agree, or Acceptable.

(Advance slide - What Happened in Each SDLC Phase)

Let me walk through what happened in each phase. In Requirements, we conducted structured interviews with OLAC administrators, teachers, and students, ran focus groups on learning styles and gaming habits, and assessed performance, security, and infrastructure needs.

In Design, we defined a three-tier architecture, modeled the PostgreSQL database schema, created use case diagrams for all user roles, and designed the curriculum-aligned game module interfaces.

In Coding, we built the system incrementally using Agile methods - React on the frontend, Node.js and Express.js for backend logic, and PostgreSQL managing the data - using Git throughout to keep the codebase clean and easy to work on as a team.

In Testing, we ran unit, integration, system, and acceptance tests across all modules - validating game mechanics, rewards, progress tracking, and analytics accuracy. Unit testing used white-box methods on functions like progress tracking and quiz logic, where we caught early bugs and fine-tuned our scoring algorithms for fairness. Integration testing confirmed that when a student finishes a game, that progress is properly stored and reflected on both the student's and the teacher's side. System testing evaluated usability, responsiveness, and compatibility across browsers and devices. And acceptance testing put real students and faculty in front of the system performing actual tasks - feedback that led to concrete improvements like simpler navigation and better contrast for accessibility.

In Deployment, SkillForge was rolled out at Our Lady of Assumption College on the school's infrastructure, accessible through web browsers and mobile devices. And in Maintenance, ongoing updates, bug fixes, and content additions are planned in coordination with the school's IT support.

(Advance slide - System Design: Architecture and User Roles)

Our system design uses a three-tier architecture: a Presentation Layer for the user interface, built with React and Tailwind; an Application Layer for logic and processing, running on Node.js and Express; and a Data Layer on PostgreSQL. This keeps the system modular and scalable, cleanly separating interface, logic, and data for maintainability.

The platform serves three user roles. Students play curriculum-aligned games, track personal progress and achievements, and view leaderboards. Teachers monitor class and individual performance in real time, generate reports, and align games with the curriculum. Admins manage user accounts and access levels, oversee settings and maintenance, and monitor platform-wide analytics.

(Advance slide - Operating Procedures by Role)

Finally, our operating procedures define a clear workflow for each role. A student logs in with their credentials, selects a subject-aligned educational game, plays and completes game modules, views their scores, badges, and leaderboard standing, and self-assesses using their personal analytics. A teacher logs in to the teacher dashboard, monitors class and individual performance, analyzes progress with built-in analytics, generates class and individual reports, and aligns game content with learning outcomes. An admin logs in to the admin panel, manages user accounts and access levels, monitors system-wide data and activity, configures platform settings and updates, and exports reports while maintaining data integrity.

That is how SkillForge was built and evaluated - which brings us to the results.

---

## Chapter 4 - Results and Discussion
**[Speaker: Guban]**

Thank you, Fernandez. I will now present Chapter 4, our Results and Discussion - this is the heart of our final defense, where we show what was actually built and how it performed.

(Advance slide - Objective 1: Curriculum-Aligned Access)

Going back to our first objective - an interactive game hub aligned with the college's curriculum - SkillForge now provides secure user authentication that protects each student account, and a centralized dashboard for curriculum-aligned content in one platform. Once a student logs in, they land on an organized hub that guides them straight to their available games and learning activities, making the whole learning process more interactive and accessible. Here you can see our login page and student dashboard.

(Advance slide - Objective 2: Subject-Aligned Educational Games)

For our second objective, creating educational games that reinforce subject matter, SkillForge offers a full catalog of games organized by academic subject - Mathematics, Science, Language Arts, and Literature - so students can select and play games matching their current lessons. Academic content is reinforced through interactive challenges that keep students engaged while strengthening key concepts. This is our games catalog, grouped by subject area.

(Advance slide - MathForge and Elemental Quest)

Here are two of our subject-specific game modules in action: MathForge for mathematics, and Elemental Quest for science.

(Advance slide - GeoMaster and Vocabulary Challenges)

And here, GeoMaster alongside our vocabulary challenge games - both with configurable difficulty and instant scoring, so students get immediate feedback as they play.

(Advance slide - Objective 3: Performance Analytics Module)

For our third objective, the analytics module, the system tracks and analyzes student performance metrics in real time and displays progress and achievements for both students and teachers. Based on this data, it identifies learning patterns, strengths, and areas of difficulty - supporting data-driven decisions that improve learning outcomes. This is our analytics dashboard.

(Advance slide - Objective 4: Gamification Elements)

For our fourth objective, gamification, students earn points and badges and advance through levels as they complete games and activities, while a leaderboard and recent-activity panel show their standing among their peers - encouraging healthy competition and sustained participation, and transforming routine study into a rewarding experience. This shows our points, badges, levels, and leaderboard in action.

(Advance slide - Verification Studies: ISO 25010 Software Evaluation)

Now, for our Verification Studies. We evaluated SkillForge's acceptability using the ISO 25010 software quality model, with one hundred eight respondents assessing the system across four criteria - Functionality, Reliability, Usability, and Portability - on a 5-point Likert scale, with responses computed as weighted means. Under this scale, weighted means between 3.7 and 4.5 fall under "Agree," which we interpret as Acceptable.

(Advance slide - ISO 25010 Evaluation: Item-Level Ratings)

For Functionality, we obtained an average weighted mean of 4.02. Respondents agreed the system performs its intended functions. The highest-rated item was secure user authentication at 4.10, with easy access to curriculum-aligned games and performance monitoring through the leaderboard both at 4.08, accurate progress tracking at 4.03, and properly functioning gamification elements at 3.95. Support for multiple concurrent users scored lowest at 3.85 - a concrete area we've identified for further optimization.

For Reliability, the average was 3.90 - our lowest-scoring criterion overall, though still within the Acceptable range. The system maintaining data integrity across user interactions was rated 4.04, while operating consistently without unexpected errors was rated 3.77. It performs dependably, but this tells us continued testing is warranted to further strengthen stability.

For Usability, we got our highest average at 4.06. The interface was rated intuitive and easy to navigate at 4.00, clear in its on-screen prompts at 4.02, and user-friendly overall at 4.10. The visually appealing and engaging design was rated 4.12 - the single highest score across our entire evaluation - confirming the interface genuinely captures and holds student interest.

For Portability, the average was 4.03. Respondents agreed the platform works across computers, laptops, and mobile phones at 4.03, and that on-screen prompts and messages stay clear across devices at 4.04.

(Advance slide - Overall Evaluation: Acceptable Across All Criteria)

Putting it all together, SkillForge obtained an overall weighted mean of 4.00, interpreted as Acceptable. Usability was our highest-rated criterion at 4.06, followed by Portability at 4.03 and Functionality at 4.02, with Reliability lowest at 3.90. Overall, our one hundred eight respondents found SkillForge to be functional, reliable, usable, and portable for its intended purpose of enhancing student engagement and learning.

---

## Chapter 5 - Summary, Conclusions, and Recommendations
**[Speaker: Guban]**

(Advance slide - Chapter 5: Summary)

To summarize: this study focused on designing and developing SkillForge, a curriculum-aligned educational game hub intended to enhance student engagement and improve learning outcomes at Our Lady of Assumption College of Laguna. The platform delivers educational games across multiple disciplines, an analytics module for tracking performance, and gamification elements that motivate learners. Evaluated by one hundred eight respondents using ISO 25010 across Functionality, Reliability, Usability, and Portability, SkillForge achieved an overall weighted mean of 4.00, interpreted as Acceptable - confirming it as a functional, reliable, usable, and portable learning tool. Usability rated highest at 4.06 and Reliability lowest at 3.90 - findings that directly shaped our recommendations.

(Advance slide - Conclusions)

Based on our objectives and evaluation results, we drew five conclusions:

One, SkillForge was successfully developed as a curriculum-aligned platform giving students secure, centralized, and more interactive access to educational content.

Two, our educational games across Mathematics, Science, Language Arts, and Literature effectively reinforce academic concepts, and our strong usability rating confirms they are engaging and easy to use.

Three, the analytics module effectively tracks and displays student progress, achievements, and performance metrics, supporting monitoring and data-driven decisions.

Four, our gamification elements - points, levels, badges, and leaderboards - increase student motivation and participation, and were affirmed by respondents as properly functioning.

And five, overall, our evaluation confirms that SkillForge is an acceptable, functional, reliable, usable, and portable system for enhancing student engagement and learning.

(Advance slide - Recommendations)

Based on these findings, we recommend the following for future work:

One, expand the game library with more genres, topics, and difficulty levels, since several respondents expressed wanting more variety to sustain their interest.

Two, enhance the visual design and add customization options, such as an alternative theme or dark mode, to make the interface even more engaging.

Three, strengthen login and security mechanisms to further safeguard user accounts and protect student data.

Four, optimize performance and responsiveness to address occasional lag and reliably support multiple concurrent users during high usage - directly addressing the lowest-scoring item in our Functionality results.

Five, improve onboarding with clearer in-game instructions, hints, and tutorials, since some first-time users reported confusion about how to play certain games.

Six, explore respondent-suggested features such as offline access and multiplayer modes in future iterations.

And seven, conduct a longer-term, classroom-embedded deployment of SkillForge to measure its actual impact on student learning outcomes - building on the system-quality evaluation we completed with one hundred eight respondents in this study.

---

## Closing

**[Guban]**
That concludes our presentation of SkillForge, from concept to completed and evaluated system.

(Advance slide - Thank You)

**[Dela Torre / Fernandez / Guban - together or whoever closes]**
Thank you very much, and we welcome your questions and feedback.
