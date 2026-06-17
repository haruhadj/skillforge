

**Development of Interactive Game Hub for Improved Student Engagement and Learning** 

A Thesis Submitted to the Undergraduate Programs   
Our Lady of Assumption College of Laguna, Inc.  
San Pedro

In Partial Fulfillment of the Requirements for the Degree   
Bachelor of Science in Computer Science

By

DELA TORRE, ZYRYLL JAY L.  
FERNANDEZ, MICHAEL G.  
GUBAN, MARK GIAN M.

2025

**CERTIFICATION**  
   
This thesis entitled “**Development of Interactive Game Hub for Improved Student Engagement and Learning”** prepared and submitted by **DELA TORRE, ZYRYLL JAY L., FERNANDEZ, MICHAEL G.,** and **GUBAN, MARK GIAN M.** in partial fulfillment of the requirements for the degree of Bachelor of Science in Computer Science has been examined and recommended for **ORAL EXAMINATION**. 

   
   
**ADRIAN ANDREW M. BALITA**

Adviser  
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**APPROVAL SHEET**

Approved by the Oral Defense Panel on \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ with a rating of \_\_\_\_\_\_\_\_\_\_\_\_\_.

 

      	       

**MARTIN G.  BONIFACIO, LPT, CHRA, DBA**

Lead Panelist

   
      Accepted in partial fulfillment of the degree of Bachelor of Science in Computer Science

   
     
   
**MARION RINGOR-ACIERTO, LPT, PhD**

Dean of College

**ABSTRACT**

**Title: 	Development of Interactive Game Hub for Improved Student Engagement and Learning** 

**Researchers	: DELA TORRE, ZYRYLL JAY M.**

**: FERNANDEZ, MICHAEL G.**

**: GUBAN, MARK GIAN M.**

**Degree: 	BACHELOR OF SCIENCE IN COMPUTER SCIENCE**

**Year: 	2025**

**Adviser: 	ADRIAN ANDREW M. BALITA**

The rapid advancement of digital technologies has significantly transformed various sectors, including education. However, despite these innovations, many educational institutions continue to face challenges in sustaining student engagement and motivation, particularly in the Senior High School curriculum. Traditional teaching methods, while effective in some respects, often fall short in capturing students’ interest in an era where interactive digital media dominates their everyday experiences. In response to this, the study developed SkillForge, an interactive educational game hub aimed at enhancing student engagement, motivation, and learning outcomes at Our Lady of Assumption College.

SkillForge is a web-based and mobile-compatible learning platform that integrates gamification elements such as points, badges, levels, and leaderboards into curriculum-aligned educational games. The platform covers key Senior High School subjects including Mathematics, Science, English, and Literature, aligning its content with the Department of Education’s standards and insights gathered from faculty members and curriculum experts. Through engaging game-based learning activities, the system transforms passive learning experiences into dynamic, interactive educational opportunities.

SkillForge incorporates a learning analytics module that monitors and evaluates student performance in real time. By collecting and analyzing user interaction data, the system provides descriptive and diagnostic insights into individual learning patterns, strengths, and areas for improvement. Teachers can utilize these insights to make informed, data-driven decisions about instructional strategies and interventions, while students benefit from personalized feedback that encourages self-directed learning.

The system was developed using the Software Development Life Cycle (SDLC) methodology, ensuring a structured and iterative approach to requirements gathering, system design, development, testing, and deployment. SkillForge was built using a modern technology stack, including Node.js and Express.js for the backend, React.js and Bootstrap for the frontend, and PostgreSQL for data storage. Apache served as the web server to ensure scalable and reliable delivery of content.

Ultimately, SkillForge is designed not to replace traditional classroom teaching, but to complement and enrich it by offering an engaging digital supplement that promotes active learning and sustained student interest. By integrating gamification with personalized learning analytics, SkillForge demonstrates the potential of educational technology to bridge the gap between conventional pedagogy and modern student learning preferences, contributing to improved academic performance and a more meaningful learning experience.

**DEDICATION**

This thesis is wholeheartedly dedicated to the people whose unwavering support, encouragement, and love inspired us to persevere throughout the challenging journey of this academic endeavor. 

This dedication goes to our respected teachers, mentors, friends, and loving parents. Above all, to Almighty God, our source of wisdom and strength.

DZJL  
FMG  
GMGM

**ACKNOWLEDGEMENT**

 	 The researchers would like to express their heartfelt gratitude and appreciation to the following kind-hearted individuals, who, in various ways, contributed to the completion of this research undertaking.

This thesis 1 undertaking would not have been possible without the support of many people. Special thanks go to their friends and classmates, and particularly to a certain group for sharing their ideas. Researchers profoundly thankful to their professor, Mr. Adrian Andrew M. Balita, whose encouragement, guidance, and support from the initial to the final stage enabled them to develop a deeper understanding of the subject. Special thanks are also due to their Research Paper Chairperson, Mr. Martin Bonifacio, LPT, CHRA, DBA for his continuous encouragement, valuable comments, and suggestions. They would like to acknowledge and thank Mr. Adrian Andrew M. Balita again for granting them permission to conduct their research at the selected senior high school campuses in San Pedro, Laguna. Finally, researchers would like to extend thanks to professors and administrators in their school division who assisted them with this project. 

DZJL  
FMG  
   GMGM

**Table of Contents**

[**CERTIFICATION**	2](#certification)

[**APPROVAL SHEET**	2](#approval-sheet)

[**DEDICATION**	6](#dedication)

[**ACKNOWLEDGEMENT**	7](#acknowledgement)

[**Table of Contents**	8](#table-of-contents)

[**LIST OF TABLES**	9](#list-of-tables)

[**LIST OF FIGURES**	10](#list-of-figures)

[**Chapter 1 Introduction**	12](#chapter-1-introduction)

[**Project Context**	12](#project-context)

[**Purpose and Description**	14](#purpose-and-description)

[**Objectives of the Study**	15](#objectives-of-the-study)

[**Scope and Limitations**	16](#scope-and-limitations)

[**Chapter 2 Related Literature and Studies**	18](#chapter-2-related-literature-and-studies)

[**Local Studies**	18](#local-studies)

[**Foreign Studies**	21](#foreign-studies)

[**Local Literature**	24](#local-literature)

[**Foreign Literature**	26](#foreign-literature)

[**Chapter 3 Operational Framework**	30](#chapter-3-operational-framework)

[**Materials**	30](#materials)

[Software	30](#software)

[Hardware	31](#hardware)

[Data	31](#data)

[**Methods**	32](#methods)

[Experimental Design	32](#experimental-design)

[**Procedures for the different phases**	34](#procedures-for-the-different-phases)

[Design Phase	36](#design-phase)

[Design of the Study	39](#design-of-the-study)

[Database Schema	39](#database-schema)

[Use Case Diagram	40](#use-case-diagram)

[Coding Phase	42](#coding-phase)

[Testing Phase	43](#testing-phase)

[Unit Testing	43](#unit-testing)

[Integration Testing	44](#integration-testing)

[System Testing	44](#system-testing)

[Acceptance testing	45](#acceptance-testing)

[Software Test Plan Flow	46](#software-test-plan-flow)

[Operating Procedures	56](#heading)

[Deployment Phase	60](#deployment-phase)

[Maintenance Phase	60](#maintenance-phase)

[Evaluation	60](#evaluation)

[**REFERENCES**	65](#references)

[**APPENDIX : CURRICULUM VITAE**	68](#appendix-:-curriculum-vitae)

**LIST OF TABLES**

**TABLE 										Page**

1. Stakeholder Interview Questions	18  
2. Hardware Specification 	20  
3. Software Specification 	21  
4. Test Matrix for SkillForge Educational Game Hub	29  
5. Test Matrix for Student 	30  
6. Test Matrix for Instructor Module	32  
7. Test Matrix for Game Module	34  
8. Test Matrix for Analytics Module	36  
9. Program Testing Module	38  
10. Student Registration Module 	39  
11. Teacher Access Module 	40  
12. Analytics Administration Module 	41  
13. Evaluation Rate 	44  
14. Software Evaluation Criteria	45

**LIST OF FIGURES**

**FIGURE										Page**

1. Game Module Interface Design	3  
2. SDLC Model (Boyce)	14   
3. System Architecture	16  
4. Database Schema	20  
5. Use Case Diagram Module 	23  
6. Use Case Diagram Student Module	24  
7. Use Case Diagram Teacher Module 	24  
8. Use Case Diagram Admin Module 	25  
9. Software Test Plan 	28

# **Chapter 1** **Introduction** {#chapter-1-introduction}

## **Project Context** {#project-context}

Digital Game-Based Learning (DGBL) has been shown to significantly enhance student engagement and motivation compared to traditional learning methods. For example, a 2023 study found that undergraduates reported higher levels of engagement and motivation when using game-based quizzes with leaderboards, as opposed to standard online quizzes (Nadeem et al., 2023). Likewise, a 2024 conference paper from China revealed that a four-week DGBL intervention notably improved digital commerce literacy and learning engagement among primary school students.

At Our Lady of Assumption College, traditional teaching approaches often struggle to sustain student attention, especially in an increasingly digital learning environment. This challenge highlights the need for more engaging, technology-integrated teaching strategies that accommodate diverse learning styles and paces.

SkillForge was developed in response to this need. It is an interactive educational game hub designed to align with the college's curriculum. Leveraging modern web and mobile technologies, SkillForge incorporates gamification elements—such as points, levels, badges, and leaderboards—to promote active student participation. The system also includes learning analytics features, capturing student interaction data to provide descriptive and diagnostic insights into performance and behavior. The collected data helps teachers adjust their approach during lessons, offering support that's better aligned with how each student learns.

By merging DGBL with learning analytics, SkillForge aims to transform education into a fun, adaptive, and data-informed experience—ultimately enhancing student motivation, engagement, and academic achievement.

## **Purpose and Description** {#purpose-and-description}

This study’s goal is to create SkillForge, a web-based educational game hub designed to boost student engagement and learning at Our Lady of Assumption College. Recognizing that traditional lectures can struggle to hold students’ attention, SkillForge applies gamification—using points, levels, badges, and leaderboards—to make learning more interactive and motivating.

Accessible on both computers and mobile devices, SkillForge offers curriculum-aligned games in key Senior High School subjects such as Mathematics, Science, English, and Literature. Each game module is crafted from curriculum analysis, educator interviews, and recognized educational standards to ensure both relevance and quality.

A built-in analytics engine tracks student interactions—measuring progress, accuracy, and time spent—to deliver instant feedback and personalized recommendations. Teachers can use these insights to identify learning gaps and tailor their instruction, while students benefit from real-time performance data that guides their study.

Following the Software Development Life Cycle (SDLC), the project moves through clear stages—requirements gathering, design, coding, testing, deployment, and maintenance—to ensure a stable, scalable platform. SkillForge is intended to complement, not replace, classroom teaching by providing an engaging digital supplement that strengthens understanding and encourages active learning.

## **Objectives of the Study** {#objectives-of-the-study}

**General Objective**      

The primary objective of this study is to design and develop SkillForge, an interactive educational game hub tailored to the curriculum of Our Lady of Assumption College, with the goal of enhancing student engagement and improving learning outcomes through gamified digital learning experiences.

**Specific Objective**

1. To develop an interactive educational game hub that aligns with the Our Lady of Assumption College curriculum and effectively engages students in the learning process.

2. The study also aims to create educational games that effectively teach and reinforce subject matter across various academic disciplines, such as Mathematics, Science, Language Arts, and Literature, etc.

3. The study seeks to implement a comprehensive analytics module capable of tracking and analyzing student performance metrics, identifying learning patterns and trends, and generating personalized recommendations based on individual student data.

4. Incorporate effective gamification elements such as points, levels, badges, and leaderboards to increase student motivation and participation in the learning process.

## **Scope and Limitations** {#scope-and-limitations}

This study focuses on the development of SkillForge, an interactive educational game hub specifically designed to align with the Senior High School curriculum of Our Lady of Assumption College. The system targets key subjects such as Mathematics, Science, English, and Literature and is intended to enhance student engagement through gamified learning experiences. Accessible via both desktop and mobile devices, the platform integrates essential features such as user authentication for secure access, progress tracking, and learning analytics. SkillForge incorporates gamification elements—points, levels, badges, and leaderboards—to create an interactive and motivating learning environment. The platform is designed as a supplementary tool to support traditional classroom instruction, providing educators with valuable insights into student performance and learning patterns.

The system's initial implementation is limited to selected grade levels within the Senior High School department and is not intended to replace formal grading systems or modify existing school policies. Its effectiveness depends on the availability of stable internet connections and compatible devices; students lacking access to these technologies outside the school environment may face limitations in using the platform. Additionally, while the study addresses curriculum-aligned subjects, it does not cover all possible academic disciplines. Post-deployment system maintenance, updates, and troubleshooting will be handled by the school's IT staff, and ongoing enhancements will depend on user feedback and resource availability.

# **Chapter 2** **Related Literature and Studies** {#chapter-2-related-literature-and-studies}

## **Local Studies** {#local-studies}

Dela Cruz (2023) examined the effects of gamification on motivation, self-regulation, and academic performance in an online physics lab for engineering technology students. The move to online labs during the pandemic led to lower student performance due to decreased motivation and self-regulation. To address this, gamified elements like leaderboards, coins, and level ranks were added to two classes. Using a mixed-methods approach with tests, surveys, learning logs, and focus groups, the study found that students’ academic results, motivation, and self-regulation improved after gamification. Qualitative data further highlighted students’ positive experiences and strategies. Overall, gamification was found to enhance motivation, self-regulation, and academic success in the online course.

Emlano and Walag (2023) investigated the creation, development, and evaluation of gamified modules centered on organic compounds for senior high school students. Aiming to address difficulties in learning organic chemistry, the researchers incorporated gamification to improve engagement and understanding. The study used a design and development research approach combined with a quantitative-descriptive method. They employed an evaluation tool based on the Department of Education’s Learning Resources Management and Development System (LRMDS) to assess the modules across six aspects: learning activity, goal clarity and challenge, instructional design, higher-order thinking skills, relevance and usability, and content quality. Results showed the gamified modules earned excellent ratings in all criteria, confirming their value as supplementary teaching resources for organic compounds. The study concluded that the modules, free of conceptual, factual, or grammatical errors, are well-suited for Grade 12 science education.

Magat (2022) conducted a study to evaluate the impact of gamified mobile courseware on senior high school students' cognitive and non-cognitive abilities in a Statistics and Probability class. The research employed a mixed-methods design, involving 104 Grade 11 students divided into four groups. Over the span of three weeks, students interacted with the gamified courseware alongside self-learning modules. Comparability between groups was established using midterm grades and pretest scores. Findings indicated that the gamified mobile courseware positively influenced students' procedural knowledge and motivation in learning mathematics. The study suggests that future research could further explore the effects of gamification elements on students' cognitive and non-cognitive abilities.

Similarly, Tolentino et al. (2024) conducted a study to examine Grade 9 students' perceptions of game-based learning (GBL) within Social Studies education. Employing a quantitative research design, the study surveyed all 271 Grade 9 students at General de Jesus College during the 2023–2024 academic year. The findings revealed that students strongly agreed on the effectiveness of GBL in enhancing their engagement, maintaining concentration, and increasing interest in Social Studies. The study recommends that educators consider using game-based tasks—like quizzes and puzzle games—as an effective approach to boost student engagement and enhance learning outcomes in Social Studies. Overall, the research concluded that integrating GBL into the classroom significantly benefits students' learning experiences in Social Studies

Medico et al. (2023) performed a quasi-experimental study to evaluate the impact of digital gamification versus traditional teaching on the mathematics performance of Grade 10 students at Bantayan National High School in Cebu, Philippines. The study involved four student sections, with two assigned to an experimental group using digital gamification tools and two to a control group receiving conventional instruction. The gamified approach included elements like leaderboards, badges, and points via platforms such as Kahoot to boost engagement and motivation. Pretests and posttests were administered to both groups to measure mathematical proficiency. Results showed that students in the gamified group significantly outperformed those in the traditional group on posttest scores. The study concluded that incorporating digital gamification into mathematics teaching effectively improves students’ mathematical abilities, highlighting the value of leveraging technology to enhance educational outcomes.

## **Foreign Studies** {#foreign-studies}

Darad (2025) examined how gamification is transforming education and corporate training by increasing learner engagement and knowledge retention. According to the article, using game-inspired features—such as earning points, unlocking badges, climbing leaderboards, and completing challenges—helps transform learning into a more enjoyable and immersive process. Gamification leverages both intrinsic and extrinsic motivators, encouraging competition, social interaction, and goal-oriented behavior, which leads to higher completion rates and improved knowledge use. The study also notes that rewards-such as badges, certificates, and incentives-further boost motivation. Furthermore, game-based tools enhanced by artificial intelligence offer customized learning experiences and instant feedback, accommodating various learning preferences. Darad emphasizes that well-implemented gamification plays a crucial role in driving digital transformation by delivering engaging and accessible learning through mobile and interactive technologies.

	Moreover, Nelson and Gabbard (2023) conducted a systematic review to examine pedagogical design principles for Mobile Augmented Reality Serious Games (MARSGs). With the growing use of mobile devices, AR, and gaming in education, the study analyzed 23 relevant articles from 2002 to 2023 using the PRISMA method. The review revealed wide variation in game element use and underlying pedagogical theories. To improve design, the authors proposed aligning game features with three key educational theories: cognitive constructivism, social constructivism, and behaviorism, while also touching on radical constructivism and instructional aspects. They concluded by summarizing current insights and recommending future research focused on grounding MARSGs in strong pedagogical frameworks to enhance learning effectiveness.

	Yu et al. (2024) developed ArchiTone, a LEGO-inspired gamified platform to make music theory engaging and accessible. Using constructivist principles, it represents musical concepts as interactive blocks for building and visualizing music structures. ArchiTone features two main functions: a Learning Mode, which guides users through music theory using well-known compositions, and a Creation Mode that allows them to craft original pieces by assembling musical blocks. Evaluation results indicated that ArchiTone enhanced student engagement and led to better comprehension and application of music theory than conventional approaches. Participants performed better in music theory tasks, indicating that visual, interactive tools like ArchiTone effectively connect theoretical knowledge with practical skills in music education.

A 2025 report from GlobeNewswire forecasts that the global K–12 game-based learning industry will grow by approximately USD 30.65 billion from 2024 to 2029, with an expected annual growth rate of 28.1%. This growth is primarily driven by an increased emphasis on STEM education, the proliferation of mobile technologies, and the integration of immersive tools like augmented and virtual reality. The market's expansion is further supported by the adoption of personalized learning strategies and the widespread implementation of bring-your-own-device (BYOD) policies in educational institutions. Major contributors to this sector include companies such as Google, Microsoft, and Kahoot, which are leading the development of innovative educational technologies.

	Tonhão et al. (2024) carried out a tertiary-level review to explore how gamification is utilized within software engineering education. Analyzing existing literature, they found that gamification is most frequently applied in areas like software testing and quality, primarily utilizing elements such as competition and cooperation. The majority of studies focused on structural gamification, which integrates game elements into the learning environment without altering the core content. The results indicate that gamification has the potential to boost students’ motivation, participation, and skill acquisition in the field of software engineering. Nonetheless, the study warns that if not properly designed, gamified approaches could hinder rather than help learning effectiveness.

## **Local Literature** {#local-literature}

Bagsic (2023) carried out a quasi-experimental study to evaluate the impact of localized, gamified supplementary materials on the academic performance of Grade 11 HUMSS students in Practical Research 1 at Cabuyao Integrated National High School. The research involved comparing a group that utilized gamified instructional materials with another group that followed conventional teaching methods. To assess the outcomes, the study analyzed pretest, formative, and posttest results using statistical tools such as mean scores, standard deviations, t-tests, and effect size calculations. Results showed the experimental group had significantly greater improvements in formative and posttest scores than the control group, indicating that localized gamified materials effectively boost student performance in research subjects.

Diesto and Narte (2024) developed an interactive mobile game aimed at enhancing foreign language acquisition, specifically focusing on Japanese. Utilizing the Agile Methodology for Mobile Applications, the development process encompassed six phases: brainstorming, design, development, quality analysis, feedback, and acceptance. The application was implemented on Android devices and evaluated using the ISO 25050 functional suitability standard and ISO 20510 standard questionnaires. Findings indicated that the game fully conformed to the functional suitability criteria, suggesting that gamification can serve as an effective tool for making language learning more interactive and engaging.

Luzano (2024) performed a systematic review to examine gamification in tertiary mathematics education in the Philippines, identifying five key themes: incorporating game elements into instructional design, boosting student motivation and engagement, fostering collaborative learning, enhancing academic performance, and addressing challenges in implementing gamified strategies. The findings indicate that gamification can improve student attitudes and learning outcomes in higher education mathematics. Nevertheless, for gamification to be successful, it must be intentionally designed to align with instructional objectives and educational best practices. The study concludes that, with thoughtful application, gamification offers substantial potential to enrich tertiary-level mathematics instruction in the Philippines.

Medico et al. (2024) conducted a quasi-experimental study at Bantayan National High School in Cebu, Philippines, comparing digital gamification and traditional teaching on Grade 10 students’ mathematics achievement. Four sections were divided: two experimental groups used gamified instruction via platforms like Kahoot, and two control groups received traditional methods. Pretests and posttests measured mathematical proficiency. Findings revealed that students taught through gamified instruction achieved notably higher posttest scores than those taught through conventional methods. The researchers concluded that incorporating digital gamification can effectively strengthen mathematical abilities and promote greater student involvement and learning efficiency through technology-based teaching approaches.

Sedillo (2024) carried out a descriptive study to assess gamification in teaching language, literacy, and communication among 34 kindergarten teachers in private schools in a highly urbanized city in Central Philippines during the 2023–2024 school year. The researcher collected information using a self-made tool that was both validated and proven to be reliable. Findings revealed a very high level of gamification instruction overall, with no significant differences across age, specialization, years of service, or training. However, significant variations were noted in auditory and visual perception, alphabet knowledge, and study skills based on educational attainment, and in visual perception by length of service. The study suggests targeted professional development for younger teachers, specialized gamified activity training, and supportive learning environments to improve gamification practices.

## **Foreign Literature** {#foreign-literature}

Liu, Fathi, and Rahimi (2024) investigated the impact of digital gamified language learning on 36 EFL learners’ language achievement, foreign language enjoyment (FLE), and ideal L2 self using a sequential explanatory mixed-methods approach. Learners were randomly assigned to a digital gamified class, using a mobile app for interactive activities, or a traditional non-digital class with printed materials. The researchers examined test scores and responses from standardized questionnaires, along with insights gathered through semi-structured interviews. Results showed both groups improved in all measures, but the gamified group outperformed the non-digital group. Qualitative analysis revealed mixed perceptions of gamified activities, supporting the quantitative findings. The study concluded that digital gamification enhances EFL learners’ language outcomes and motivation, suggesting its potential for wider use in language education.

Nilubol and Sitthitikul (2025) explored how a Gamified Learning Model (GLM) influences the writing abilities and metacognitive awareness of Thai EFL university students within a blended learning environment. The study utilized a quasi-experimental one-group pretest-posttest format alongside a Concurrent Embedded mixed-methods strategy to assess the model’s effectiveness. Quantitative results from paired t-tests showed significant improvements in writing skills (mean scores rising from 11.97 to 19.92, p\<0.01) and metacognitive awareness, as indicated by higher questionnaire scores. Qualitative data from interviews and reflective journals revealed positive student perceptions, emphasizing GLM’s role in boosting engagement and deepening understanding of writing tasks. The study highlights gamified learning’s potential in EFL education, recommending its integration into language pedagogy and suggesting further research into diverse gamified approaches across various educational contexts.

Temel and Cesur (2024) explored how using gamification through Web 2.0 tools—such as Kahoot\!, Socrative, Quizizz, and Mentimeter—impacted the motivation and academic success of EFL learners in online settings. The study used a mixed-methods approach, combining both numerical data and qualitative insights. The findings revealed that the integration of gamified elements significantly enhanced students' motivation and academic performance, suggesting that the incorporation of interactive and engaging tools can positively impact learning outcomes in EFL contexts.

Henry, Li, and Arnab (2024) carried out a systematic mapping review focusing on university students’ initial views toward gamification and game-based learning before actual engagement with these approaches. They found a notable research gap, as no prior studies examined students’ attitudes before experiencing these methods. While many studies report positive perceptions after exposure, the absence of baseline data limits understanding of their true impact. The authors stress that knowing students’ initial attitudes is vital because preconceptions may affect the effectiveness of gamified learning. They recommend future research include pre-exposure perceptions to improve evaluation and design of such educational interventions.

Hou (2023) offers a thorough examination of the current trends and future challenges in game-based learning (GBL) and gamified teaching within education. The study identifies three key areas of development: the application of GBL across diverse subjects such as language, science, and vocational training, with particular attention to escape room mechanics that enhance problem-solving; the use of gamification elements like badges and leaderboards to motivate students, alongside the challenges faced in their implementation; and comprehensive reviews of existing research that highlight the progress and gaps in the field. Additionally, Hou discusses emerging directions, including the adoption of remote and blended learning models, the incorporation of advanced technologies like the metaverse and artificial intelligence, and the emphasis on creating authentic learning experiences that connect virtual environments with real-world contexts. These advancements aim to improve the effectiveness and relevance of game-based learning in modern educational settings.

# **Chapter 3** **Operational Framework** {#chapter-3-operational-framework}

## **Materials** {#materials}

### **Software** {#software}

 	The development of SkillForge utilizes a modern and robust software stack tailored for web-based educational applications. Development is conducted on the Windows 11 operating system. PostgreSQL is utilized as the primary relational database, chosen for its reliability and ability to manage structured data effectively, which aligns well with storing user profiles, game progress, and analytics in a consistent and organized format.

The system supports a wide range of popular web browsers—such as Chrome, Firefox, Opera GX, Microsoft Edge, and Safari—ensuring it can be accessed seamlessly across various platforms. Web content is delivered through the Apache web server, which offers a reliable and scalable solution for hosting and distributing application resources.

On the backend, the system is developed using Node.js along with the Express.js framework to handle server-side logic efficiently. The frontend is implemented with React.js, delivering a responsive and dynamic user experience. JavaScript is employed across both frontend and backend development, streamlining the development workflow. The interface design leverages the Bootstrap framework, allowing for responsive layouts across various device sizes.

### **Hardware**  	 	 	 	  {#hardware}

 	SkillForge requires specific hardware for optimal development and deployment. A desktop or laptop with at least an Intel i3/i5 or equivalent AMD processor and a minimum of 4 GB RAM (8 GB recommended) is needed to handle game development and real-time analytics. At least 128 GB of storage is required for tools, code, assets, and databases.

For deployment, a reliable web server with similar specs is necessary to support multiple users. Input devices include a USB/Bluetooth mouse and keyboard for desktops, and touchscreen support with gesture and orientation input for mobile devices.

###  **Data** {#data}

The SkillForge system organizes educational, user, assessment, and administrative data based on the Our Lady of Assumption College curriculum. It supports Senior High School subjects through modular game content, tracks student performance and engagement, manages teacher and student information, and ensures data privacy while enabling effective learning analytics. 

 

**Figure1. Game Module Interface Design**

 	The figure shows the layout of an educational game module within SkillForge, highlighting key features such as game list, learning goals, and progress tracking. The users can choose some games or some modules  to navigation and integrates gamification to boost student engagement and reinforce learning through interactive elements and real-time feedback.

## **Methods **	 	 	 	 	 	 	 	        {#methods}

### **Experimental Design** {#experimental-design}

     	The development of SkillForge follows the developmental research methodology, focusing on designing, developing, and evaluating an educational technology solution. The research employs the Software Development Life Cycle (SDLC) approach, consisting of six comprehensive phases. Each phase serves a critical function in ensuring the systematic development of a high-quality educational gaming platform that meets the specific needs of Our Lady of Assumption College.

The SDLC methodology is particularly suitable for this project as it provides a structured approach to software development while allowing for iterative improvements based on user feedback and testing results. This methodology ensures that the final product meets educational objectives while maintaining technical reliability and user-friendliness.

The developmental approach allows for continuous refinement of game mechanics, user interface design, and educational content based on empirical testing and stakeholder feedback. This iterative process ensures that SkillForge evolves to meet the dynamic needs of students and educators throughout the development cycle.

![][image1]

**Figure2. SDLC Model (Boyce)**

The SDLC diagram presents the step-by-step approach used in building SkillForge, outlining each phase of its development process. We first gathered user needs, then designed the system’s structure and features. Next, we developed and tested the platform using modern web tools to ensure it worked smoothly. After deploying it at Our Lady of Assumption College, we planned ongoing updates. This process helped us build an effective, engaging game hub to boost student learning.

## **Procedures for the different phases **	  {#procedures-for-the-different-phases}

**Requirement gathering and Analysis Phase** 

        The requirements gathering phase starts with detailed interviews of stakeholders, including administrators, teachers, and students at Our Lady of Assumption College. The research team conducts structured interviews to identify educational challenges, technology usage, and specific needs for the educational gaming platform.

Focus groups with Senior High School students collect feedback on their learning styles, gaming habits, and expectations for educational tools. Teachers are interviewed to clarify curriculum demands, assessment criteria, and features needed for tracking student progress.

Technical requirements are also assessed, covering system performance, security, and integration with existing school infrastructure.

**Table 1**

***Stakeholder Interview Questions***

| Stakeholder | Key Questions |
| ----- | ----- |
|  Students | Have you ever used an educational game or app as part of your learning? If yes, can you describe your experience? Do you think learning through games makes it more fun and easier to understand lessons? Why or why not? Which subjects do you think would be more interesting if taught through interactive games (e.g., Math, Science, English)? Would you be more motivated to study if your progress was tracked and rewarded with achievements or rankings? Do you feel more motivated to participate when learning includes fun and interactive elements like games or challenges?  |
|  Teachers | What are the biggest challenges you face in keeping students engaged and motivated in your classroom, and how do you currently address these challenges? Have you ever incorporated game-based learning or gamified tools in your teaching? In your opinion, how can gamification enhance student engagement and learning outcomes in the classroom? If you had access to a gamified learning platform, what features would be most valuable for your teaching goals and classroom management? What concerns or expectations do you have about using a game hub like SkillForge in your classes? |

### **Design Phase**  {#design-phase}

The design phase defines the system’s structure and user interface. It uses a three-tier architecture: a user-facing presentation layer, a logic-based application layer, and a data layer for storage. The interface is designed to be visually engaging and easy to navigate for Senior High School students, while staying focused on educational goals. Game visuals blend modern aesthetics with clear learning objectives and progress tracking. The database is structured using entity-relationship modeling to manage user data, game content, and analytics, with scalability built in to support future growth.     

Tables 2 and 3 list the hardware and software specifications of the proposed project.

**Table 2**

***Hardware Specification***

| Item Name  | Description  |
| :---- | :---- |
| Processor  | At least intel i3 to i5 processor or AMD equivalent |
| Memory  | 4GB minimum |
| Input Device  | USB / Bluetooth / Optical Mouse / Touch Screen (for mobile) |
| Output Device  | USB / Bluetooth / Optical Keyboard  |
| Monitor  | At least 15” LED  |
| Hard Drive  | 128GB  |

      The table above shows the technical descriptions of the components and capabilities of the computer, which are included in the hardware specifications. 

**Table 3**

***Software Specification***

| Item Name  | Description  |
| :---- | :---- |
| Operating System  | Windows 10/11  |
| Web Server  | Apache  |
| Database Server  | PostgreSQL  |
| Script Language Backend Framework  | Python, JavaScript  Node.js with Express.js |
| Frontend Framework  | Bootstrap, React.js |
| Browser  | Chrome /Microsoft Edge etc.  |

 	 

 	The table presents the software specifications used to provide software developers with a detailed description of the product's intended usability, appearance, and interactions.

 

### **Design of the Study**  {#design-of-the-study}

**Figure3. System Architecture**

       	The figure shows a gamified learning loop where students log in, complete challenges, earn points, and view their progress on a leaderboard. This cycle personalizes learning, encourages participation, and motivates students through feedback and competition.

### **Database Schema**  {#database-schema}

     	The Figure database schema is structured to effectively manage educational gaming data while ensuring data integrity and supporting analytics. It includes several key entities: the *Users* collection stores account details and roles for students and teachers; the *Games* collection holds metadata, content, difficulty levels, and curriculum alignment; the *Progress* collection monitors student performance, such as scores and time spent; the *Analytics* collection captures detailed interaction data for learning insights; and the *Achievements* collection handles gamification elements like badges and leaderboards. To support real-time analytics and reporting, the schema also employs indexing strategies to enhance query efficiency.

**Figure4. Database Schema**

The figure above shows that the database has an entity relationship that can be created with the tables. It enables a relational database to efficiently store huge amounts of data and effectively retrieve selected data.


### **Use Case Diagram**  {#use-case-diagram}

**![][image2]**

**Figure5. Use Case Diagram Module**

This diagram presents a high-level overview of the system interactions for all three user types: Student, Teacher, and Admin. It illustrates each user's primary functions within the platform, such as playing games, monitoring students, and managing the system.

![][image3]

**Figure6. Use Case Diagram Student Module**

The Student accesses educational games and tracks their learning progress within the system.

![][image4]

**Figure7. Use Case Diagram Teacher Module**

The Teacher observes student activities and checks detailed performance analytics to support learning oversight.

![][image5]

**Figure8. Use Case Diagram Admin Module**

The Administration (Admin) is responsible for overseeing and maintaining the system.

### **Coding Phase**  {#coding-phase}

 	The system is built in small steps using Agile methods. The front end uses React and Bootstrap to make the user interface smooth and manage data. The back end uses Node.js and Express to handle server tasks and communication, with secure login. Games are made with simple approach and are designed to be flexible for different topics and skill levels. Good coding practices and Git are used to keep the code clean, organized, and easy to work on as a team.

### **Testing Phase**  {#testing-phase}

 	To ensure that SkillForge functions as intended and aligns with both technical and educational requirements, several testing methodologies were applied throughout the development cycle. This multi-layered approach helps identify and resolve potential issues at every level of the software stack and ensures a stable, user-friendly experience.

### **Unit Testing**  {#unit-testing}

 	Each game module and system component was tested independently to verify its basic functionality. This included validating interactive elements within educational games, student login mechanisms, and backend processes such as data storage and retrieval. During this phase, white-box testing was used extensively to check the logic within individual functions, including user progress tracking, achievement unlocking, and curriculum-aligned quizzes.

Unit testing helped identify minor bugs early, especially within the React-based frontend and Node.js backend services. For example, scoring algorithms were fine-tuned to ensure fairness and accuracy across different game types and difficulty levels.

To identify, analyze, and address flaws in the system, it is crucial to isolate each component.

Unit Testing \- Advantages:

* Reduces bugs when changing existing functionality or in newly developed features.

* Lowers testing costs as defects are identified very early.

*  Improves design and facilitates easier code refactoring.

* Enhances the quality of the build when unit tests are included in the build process.

### **Integration Testing**  {#integration-testing}

 	After ensuring each unit worked as expected, integration testing followed. This stage assessed whether modules such as the game interface, user authentication, leaderboard system, and analytics dashboard worked cohesively. Several test cases focused on verifying the communication between the frontend and backend services, database interaction, and real-time updates in the learning analytics dashboard.

This testing confirmed that when a student completed a quiz, the progress was correctly stored, analyzed, and reflected on both the student’s interface and the teacher’s dashboard.

### **System Testing**  {#system-testing}

 	Comprehensive system testing was performed to verify the fully integrated environment of SkillForge. Using black-box testing methods, the system was assessed based on its functional and non-functional requirements. Particular attention was given to usability, responsiveness, compatibility across different web browsers, and adaptability on mobile devices.

It was verified that students could access the platform across devices and browsers (Chrome, Edge, Safari), complete educational challenges, view their ranks, and receive feedback, while teachers could monitor class performance metrics.

### **Acceptance testing**  {#acceptance-testing}

Lastly, acceptance testing was conducted with the participation of students and faculty members from Our Lady of Assumption College. Participants were guided through key features of the platform and asked to perform typical tasks such as logging in, completing games, and viewing progress.

Feedback was gathered through surveys and observational studies, which highlighted the intuitive interface, engaging gameplay mechanics, and the effectiveness of real-time feedback. Minor improvements were made based on this feedback, such as simplifying navigation and increasing contrast for better accessibility.

### **Software Test Plan Flow**  {#software-test-plan-flow}

![][image6]

**Figure9. Software Test Plan**

         The Software Test Plan Flow for system outlines a comprehensive, layered approach to ensure the platform meets its functional, performance, and usability requirements before deployment. The process began with test planning, where objectives, scope, and risks were defined for each module, including the game engine, login system, analytics dashboard, and achievement system. Detailed test cases were then designed, addressing standard and edge scenarios, especially those relevant to educational contexts. Testing was conducted in a simulated environment using both automated and manual methods, focusing on functionality and user experience. Any defects were tracked and prioritized for resolution, with critical issues fixed immediately. Regression testing followed to confirm system stability after updates. Test reports summarized the outcomes, guiding deployment decisions. The plan included unit, integration, system, and acceptance testing to validate individual features, module interactions, overall functionality, and user satisfaction.

**Table 4**

***Test Matrix for SkillForge Educational Game Hub***

| MODULES  | SUB MODULES  | TEST TYPE  |
| :---- | :---- | :---- |
| Student  |  |  |
|   | Student Registration  Game Access Progress Tracking Module Achievement System Leaderboard | Unit Testing  Unit Testing Integration Testing Integration Testing Integration Testing |
| Instructor  |  |  |
|   | Student Performance | Unit Testing  |
|   | Analytics Report | Integration Testing  |
|   | Curriculum Management | Unit Testing  |
|   | Assignment Creation | Unit Testing  |
| Game  |  |  |
|   | Game Initialization Score Calculation Progress Tracking Achievement System | Unit Testing  Unit Testing Integration Testing Integration Testing |
|  Analytics |  Data Collection Report Generation Performance Metrics |  Unit Testing Integration Testing System Testing |

        In the test plan, the modules will undergo testing and trials to determine whether the system is functioning properly.

Below is the test plan for each module.

**Table 5**

***Test*** ***Matrix for Student***

| Test ID   | 1  |
| :---- | :---- |
| Test Name   | Student Game Access and Progress Tracking |
| Description  | Ensure that student components pass unit and integration testing, and perform educational gaming operations as expected. |
| Pre-requisite  | Valid student account and internet connection |
| Test  Environment  | Production Server Environment |
| Test Strategy  | Unit and Integration Testing |

 

| Step  | Description  | Expected Results  |
| :---- | :---- | :---- |
| 1  | Open SkillForge Educational Game Hub in a web browser  | The login page is displayed correctly with school branding |
| 2  | Enter valid student credentials and login | The student dashboard displays available games and current progress |
| 3  | Select a Mathematics game module | The game loads with proper instructions and learning objectives |
| 4  | Complete a game level/challenge | Points are awarded, progress is saved, and feedback is provided |
| 5  | Access leaderboard | Current rankings and achievements are displayed accurately  |
| 6  | View personal progress analytics | Individual performance metrics and learning insights are shown |
| 7 | Logout from the system | Session ends securely and returns to login page |

**Table 6**

***Test Matrix for Instructor Module***

| Test ID   | 2  |
| :---- | :---- |
| Test Name   | Instructor Performance Monitoring and Analytics |
| Description  | Ensure that instructor components pass unit and integration testing, and perform student monitoring and analytics operations as expected. |
| Pre-requisite  | Valid instructor account, registered students in the system, and internet connection |
| Test  Environment  | Windows 10 / 11, Google Chrome Browser |
| Test Strategy  | Unit and Integration Testing |

 

| Step  | Description  | Expected Results  |
| :---- | :---- | :---- |
| 1  | Open the Game Hub and login with instructor credentials  | The instructor dashboard displays correctly with school branding and navigation menu |
| 2  | Access student performance analytics section | Student performance dashboard loads showing enrolled students and their progress metrics |
| 3  | Select a specific student to view detailed performance | Individual student analytics display with game completion rates, scores, and time spent |
| 4  | Generate a performance report for the class | Comprehensive class report generates with visual charts and downloadable format |
| 5  | Access curriculum management section | Curriculum alignment tools display with subject mapping and learning objectives |
| 6  | Monitor real-time student activity during class | Live activity dashboard shows currently active students and their game progress |
| 7 | Export student data for record keeping | Data export functionality provides CSV/PDF formats with complete student records |
| 8 | Logout from the instructor system | Session ends securely and returns to login page |

**Table 7**

***Test Matrix for Game Module***

| Test ID   | 3  |
| :---- | :---- |
| Test Name   | Game Engine Functionality and Progress Integration |
| Description  | Ensure that game components pass unit and integration testing, and perform educational gaming operations with proper scoring and achievement systems. |
| Pre-requisite  | Valid student account, available game content, and stable internet connection |
| Test  Environment  | Windows 10 / 11, Google Chrome Browser |
| Test Strategy  | Unit and Integration Testing |

 

| Step  | Description  | Expected Results  |
| :---- | :---- | :---- |
| 1  | Launch a spicific game module from student dashboard | Game initializes properly with loading screen, instructions, and learning objectives |
| 2  | Complete the game tutorial/introduction | Tutorial guides user through game mechanics and controls effectively |
| 3  | Play through multiple difficulty levels | Game progression works smoothly with increasing complexity and appropriate challenges |
| 4  | Test score calculation during gameplay | Points are given accurately based on correct answers and completion time |
| 5  | Trigger achievement unlocking by meeting specific criteria | Badges and achievements unlock correctly and display achievement notification |
| 6  | Test game pause and resume functionality | Game state is preserved correctly though database when paused and resumed |
| 7 | Complete a full game session | Final score calculation is accurate and progress is properly saved to database |
| 8 | Exit game and verify progress tracking | Game progress is correctly updated in student profile and leaderboard |

**Table 8**

***Test Matrix for Analytics Module***

| Test ID   | 4  |
| :---- | :---- |
| Test Name   | Data Collection and Report Generation System |
| Description  | Ensure that analytics components pass unit, integration, and system testing, and perform data collection, analysis, and reporting operations as expected. |
| Pre-requisite  | Active user data, completed game sessions, and administrator access |
| Test  Environment  | Windows 10 / 11, Google Chrome Browser |
| Test Strategy  | Unit, Integration, and System Testing |

 

| Step  | Description  | Expected Results  |
| :---- | :---- | :---- |
| 1  | Access analytics dashboard with administrator credentials | Analytics dashboard loads with overview of system-wide metrics and user activity |
| 2  | Test data collection from active game sessions | Real-time data capture shows current active users, game sessions, and performance metrics |
| 3  | Generate individual student performance reports | Detailed individual reports generate with learning progress, strengths, and areas for improvement |
| 4  | Test performance metrics calculations | Metrics such as average scores, completion rates, and time-on-task calculate accurately |
| 5  | Verify data visualization components | Charts, graphs, and visual elements render correctly and provide meaningful insights |
| 6  | Test report export functionality | Reports export successfully in multiple formats (PDF, Excel, CSV) |
| 7 | Validate data filtering and sorting options | Filter and sort functions work properly for date ranges, subjects, and student groups |
| 8 | Test system performance with large datasets | Analytics system maintains performance with high volume of user data and concurrent requests |

###  {#heading}

### **Operating Procedures** 

       The Operating Procedures outline the step-by-step usage of SkillForge by its key users: Students, Teachers, and Administrators. These procedures are designed to ensure that the system is used effectively and consistently in both classroom and independent learning environments.

**Table 9**

***Program Testing Module***

| MODULE: *PROGRAM TESTING*  |  |
| :---- | :---- |
| **PROCESS**  | **WORK INSTRUCTIONS**  |
| ![][image7]  | The tester starts the process by launching the desktop game. The tester will check the game mechanics and complete a full game session. After completing the session, the tester will test the game on mobile. Next, the tester will check the curriculum and test the rewards system. After all steps are done, the tester completes the testing process.  |

**Table 10**

***Student Registration Module***

| MODULE: STUDENT REGISTRATION  |  |
| :---- | :---- |
| **PROCESS**  | **WORK INSTRUCTIONS**  |
|  ![][image8] | Student accesses the system using their credentials. Student chooses a curriculum-based educational game. Student plays the game, with progress and scores automatically tracked. Student views scores, achievements, and leaderboard ranking; progress is saved.  |

**Table 11**

***Teacher Access Module***

| MODULE: TEACHER ACCESS |  |
| :---- | :---- |
| **PROCESS** | **WORK INSTRUCTIONS**  |
| ![][image9] | The teacher logs in to view an overview of student activities. Reviews individual and class performance metrics such as scores, time spent, and completion rates. Identifies trends and areas needing improvement from performance data. Creates detailed reports on student progress and curriculum alignment. Tracks real-time student engagement during class sessions. Exports student data for administrative records and future reference.  |

**Table 12**

***Analytics Administration Module***

| MODULE: *ANALYTICS ADMINISTRATION* |  |
| :---- | :---- |
| **PROCESS** | **WORK INSTRUCTIONS**  |
| ![][image10] | Administrator logs in to access the analytics dashboard. Views real-time user and system activity data. Reviews key performance metrics across the platform. Generates detailed student and class performance reports. Analyzes data using visual tools like charts and graphs. Filters and sorts data for targeted insights. Exports reports in multiple formats for records and presentations.  |

The table above provides a clear sequence of steps that a student should follow when using the student registration module.

### **Deployment Phase**  {#deployment-phase}

Once testing is successfully completed, the system is released for use by the client. This phase marks the shift of SkillForge from the development stage to its live environment at Our Lady of Assumption College. It includes essential activities aimed at ensuring a smooth rollout and encouraging effective user adoption. 

### **Maintenance Phase**  {#maintenance-phase}

The maintenance phase focuses on ensuring the system's long-term reliability and adaptability by addressing issues, implementing updates, and responding to user feedback. It involves corrective and adaptive maintenance, regular updates for security and performance, curriculum-aligned content updates, and ongoing user support. Continuous performance monitoring is also conducted to maintain optimal system functionality as usage increases.   

### **Evaluation** 	 	 	 	 	 	 	      {#evaluation}

The evaluation of SkillForge follows established software evaluation standards to ensure comprehensive assessment of system quality and educational effectiveness. The evaluation framework is based on ISO 25010 software quality model, which defines eight quality characteristics for software systems.

**Functional Suitability**: Evaluation focuses on whether SkillForge provides the necessary functions to support educational gaming objectives, including game mechanics, progress tracking, and analytics capabilities.

**Performance Efficiency**: Assessment of system response times, resource utilization, and capacity to handle concurrent users during peak educational periods.

**Compatibility**: Testing of system interoperability across different devices, browsers, and operating systems to ensure broad accessibility for students and teachers.

**Usability**: Comprehensive evaluation of user interface design, learnability, and user satisfaction through direct interaction with target users.

**Reliability**: Assessment of system stability, fault tolerance, and recovery capabilities to ensure consistent educational service delivery.

**Security**: Evaluation of data protection measures, user authentication systems, and privacy compliance for educational environments.

**Maintainability**: Assessment of code quality, system modularity, and ease of future updates and enhancements.

**Portability**: Testing of system adaptability across different deployment environments and scalability requirements.  

The respondents evaluated these characteristics using a 5-point Liker scale, as presented in the table below. 

**Table 13**

***Evaluation Rate***

| Scale  | Range  | Interpretation  |
| :---- | :---- | :---- |
| 5 | 4.6 \- 5.0 | Strongly Agree |
| 4 | 3.7 \- 4.5 | Agree |
| 3 | 2.8 \- 3.6 | Neither agree nor disagree |
| 2 | 1.9 \- 2.7 | Disagree |
| 1 | 1.0 \- 1.8 | Strongly Disagree |

The evaluation process combines quantitative data—such as system performance, user engagement, and learning outcomes—with qualitative feedback from users to assess system effectiveness. It measures student engagement, learning progress, and teacher satisfaction, comparing results to pre-implementation baselines to determine SkillForge's educational impact.

**Software Evaluation Criteria** 

    Name:                                        	       Signature: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_                               

Position: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_        

                               

Direction: Check the box that corresponds to your answer. Use the legend as your guide. 

LEGEND:   	5 – Strongly Agree  (SA)     4 – Agree (A)    	3 – Neutral(N)   	

                          2 \- Disagree  (D)   1- Strongly Disagree (SD)

**Table 14**

     ***Software Evaluation Criteria*** 

| Criteria  | Indicators  | Ratings  |  |  |  |  |
| :---- | :---- | :---- | :---- | :---- | ----- | :---- |
|  |  | **5 (SA)**  | **4 (A)**  | **3  (N)** | **2  (D)** | **1 (SD)**  |
| Functionality  | The system provides secure user authentication for students and teachers |   |   |   |   |   |
|  | Students can easily access and play educational games aligned with curriculum |   |   |   |   |   |
|  | The system accurately tracks and displays student progress and achievements |   |   |   |   |   |
|  | Teachers can effectively monitor student performance through analytics dashboard |   |   |   |   |   |
|  | The gamification elements (points, badges, leaderboards) function properly |   |   |   |   |   |
|  | The system supports multiple concurrent users without performance issues |   |   |   |   |   |
| Reliability  | The system operates consistently without unexpected errors or crashes |   |   |   |   |   |
|  | The system maintains data integrity across all user interactions |   |   |   |   |   |
| Usability         | The interface is intuitive and easy to navigate for students |   |   |   |   |   |
|  | Provides on-screen prompts and messages that are clear and helpful to the end users.  |     |   |   |   |   |
|  | It is user-friendly.   |   |   |   |   |   |
|  | The design is visually appealing and engaging for students |   |   |   |   |   |
| Portability     | Can be accessed through different devices such as computer, laptop, mobile phone, etc.   |   |   |   |   |   |
|  | Provides on-screen prompts and messages that are clear through different devices.   |    |   |   |   |   |

**REFERENCES**

**Project Context**

Deterding, S., Dixon, D., Khaled, R., & Nacke, L. (2011). From game design elements to gamefulness: Defining “gamification.” In \*Proceedings of the 15th International Academic MindTrek Conference\* (pp. 9–15). [https://doi.org/10.1145/2181037.2181040](https://doi.org/10.1145/2181037.2181040)

Gee, J. P. (2003). \*What video games have to teach us about learning and literacy\*. Palgrave Macmillan.

Prensky, M. (2001). \*Digital game-based learning\*. McGraw-Hill.

**Local Studies**

Bagsic, M. (2023). Impact of localized, gamified supplementary materials on the academic performance of Grade 11 HUMSS students in Practical Research 1\. Cabuyao Integrated National High School.

Dela Cruz, A. (2023). Gamification in Online Physics Labs: Motivation, Self-Regulation, and Academic Performance. Philippine Journal of Educational Technology.

Diesto, A., & Narte, J. (2024). Development of an Interactive Mobile Game for Japanese Language Learning Using Agile Methodology. Journal of Mobile Learning Research.

Emlano, M., & Walag, A. (2023). Gamified Modules on Organic Compounds: A Design and 	Evaluation Study. Department of Education LRMDS.

Magat, R. (2022). Gamified Mobile Courseware in Statistics and Probability: Impact on Senior High School Students. Philippine Journal of Mathematics Education.

Medico, D., et al. (2023). Digital Gamification vs. Traditional Teaching in Mathematics Performance. Bantayan National High School.

Medico, D., et al. (2024). Gamified Mathematics Instruction: A Quasi-Experimental Study. Bantayan National High School.

Tolentino, V., et al. (2024). Game-Based Learning in Social Studies: Grade 9 Perceptions and Engagement. General de Jesus College Research Journal.

**Local Literature**

Luzano, R. (2024). Gamification in Tertiary Mathematics Education: A Systematic Review. Philippine Journal of Higher Education.

Sedillo, K. (2024). Gamification in Kindergarten Language and Literacy Instruction: A Descriptive Study. Journal of Early Childhood Education in the Philippines.

**Foreign Studies**

Darad, M. (2025). Gamification's Role in Education and Corporate Training. EdTech Research Journal.

Henry, A., Li, K., & Arnab, S. (2024). Mapping Students’ Pre-Perceptions of Gamification in Higher Education. Journal of Educational Games and Learning.

Liu, Q., Fathi, J., & Rahimi, M. (2024). Digital Gamified Language Learning: Effects on EFL Learners’ Achievement and Motivation. International Journal of Language Learning.

Nelson, J., & Gabbard, J. (2023). Design Principles for Mobile Augmented Reality Serious Games: A Systematic Review. Journal of Interactive Learning Technologies.

Nilubol, P., & Sitthitikul, P. (2025). Gamified Learning Model for Thai EFL Learners: Effects on Writing Skills and Metacognitive Awareness. Journal of Educational Technology Research.

Temel, E., & Cesur, T. (2024). Web 2.0 Gamification Tools and Their Impact on EFL Learning Outcomes. International Journal of E-Learning and Teaching.

Tonhão, A., et al. (2024). Gamification in Software Engineering Education: A Tertiary Study. Journal of Software Education Research.

Yu, S., et al. (2024). ArchiTone: A Gamified LEGO-Inspired Platform for Music Theory Education. Journal of Music and Learning Technologies.

**Foreign Literature**

Hou, H. (2023). Current Trends and Challenges in Game-Based Learning (GBL). Journal of Digital Education and Learning.