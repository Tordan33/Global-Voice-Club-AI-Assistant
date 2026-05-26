
export type Language = 'en' | 'zh';

export const actionPlan = {
    en: {
        grammar: {
            beginner: {
                insight: "Your sentences often skip the main verb when you are thinking about what to say. This makes your English sound like a list of words rather than a complete thought.",
                goal: "After completing this plan, you will be able to speak 5 complete sentences about your morning routine without dropping a single verb.",
                tasks: [
                    { goal: "Practice basic S-V-O structure", whatToSay: "Situation: You are telling a friend about your morning. Say: 'I woke up. I drank water. I walked to the door. I saw my keys. I left the house.'", timeRule: "Speak clearly. No time limit.", completion: "Complete the recording of all 5 sentences twice." },
                    { goal: "Combine thoughts naturally", whatToSay: "Situation: You are at work. Say: 'I arrived at 9 AM and I started my computer.'", timeRule: "Speak at a steady pace.", completion: "Finish one recording without pausing before 'and'." }
                ],
                upgrade: { original: "I morning coffee bread.", improved: "I had coffee and bread this morning." }
            },
            intermediate: {
                insight: "Your main challenge is connecting ideas. You tend to speak in short, separate bursts, which stops your listener from understanding your logic clearly.",
                goal: "You will be able to explain a simple work decision using 'because' to link two facts in one smooth breath.",
                tasks: [
                    { goal: "Use connectors in context", whatToSay: "Situation: A colleague asks why you chose a specific restaurant. Say: 'I chose that place because it is very quiet and the food is healthy.'", timeRule: "Speak for 30 seconds.", completion: "One recording with two different 'because' sentences." },
                    { goal: "Contrast ideas", whatToSay: "Situation: Explaining why a project is late. Say: 'Although the team worked hard, we needed more time to finish.'", timeRule: "Start the sentence with 'Although'.", completion: "Record the sentence three times without stopping." }
                ],
                upgrade: { original: "The project hard. We need time.", improved: "Although the project was hard, we managed to finish it." }
            }
        },
        vocabulary: {
            beginner: {
                insight: "You rely heavily on the word 'thing' or 'this' because you don't yet have the specific names for your daily items.",
                goal: "You will be able to name 5 specific items in your office or room correctly without hesitation.",
                tasks: [
                    { goal: "Identify surroundings", whatToSay: "Situation: You are showing someone your desk. Say: 'This is my laptop. This is my monitor. This is my notebook.'", timeRule: "Point and speak within 10 seconds.", completion: "Complete the sequence 5 times." },
                    { goal: "Describe functions", whatToSay: "Situation: Explaining what you use. Say: 'I use my pen to write. I use my phone to call.'", timeRule: "Speak in full sentences.", completion: "One recording of both sentences." }
                ],
                upgrade: { original: "Give me the thing.", improved: "Please pass me the notebook." }
            }
        },
        pronunciation: {
            beginner: {
                insight: "You are cutting off the final 's' or 't' sounds at the end of words. This makes it hard for listeners to tell if you are talking about one thing or many things.",
                goal: "You will clearly pronounce the final consonant sound in 10 simple words during a short narrative.",
                tasks: [
                    { goal: "Consonant snap", whatToSay: "Situation: Listing items. Say: 'Cats. Books. Maps. Hats. Lights.' Emphasis on the 's' and 'ts'.", timeRule: "Over-emphasize the end sounds.", completion: "Record once, then listen to check if you can hear the final 's'." },
                    { goal: "Ending 't' clarity", whatToSay: "Situation: Ordering food. Say: 'I want a hot toast.' Emphasis on 't' in 'want', 'hot', and 'toast'.", timeRule: "Speak slowly first, then normal speed.", completion: "Record three times." }
                ],
                upgrade: { original: "He like cat.", improved: "He likes cats." }
            }
        },
        fluency: {
            beginner: {
                insight: "Your speaking stops whenever you need to think of a word. These long silences break the connection with your listener.",
                goal: "You will be able to speak for 30 seconds straight without a pause longer than 2 seconds.",
                tasks: [
                    { goal: "Continuous flow", whatToSay: "Situation: Describing your favorite color. Say why you like it and name 3 things that are that color.", timeRule: "Speak for exactly 30 seconds.", completion: "Recording finishes without any silence longer than 2 seconds." },
                    { goal: "Using filler words", whatToSay: "Situation: Someone asks your opinion on a movie. Use 'Well...' or 'Actually...' when you start to think.", timeRule: "Do not stop talking.", completion: "Record a 45-second review using fillers." }
                ],
                upgrade: { original: "(silence) ... pizza good.", improved: "Well, actually, the pizza was very good." }
            }
        }
    },
    zh: {
        grammar: {
            beginner: {
                insight: "你在思考時經常漏掉主動詞。這讓你的英語聽起來像是單詞列表，而不是完整的想法。",
                goal: "完成此計畫後，你將能說出 5 個關於早晨例行公事的完整句子，且不漏掉任何動詞。",
                tasks: [
                    { goal: "練習基礎 S-V-O 結構", whatToSay: "情境：你正在告訴朋友你的早晨。說：'I woke up. I drank water. I walked to the door. I saw my keys. I left the house.'", timeRule: "清晰說話，無時間限制。", completion: "完成這 5 個句子的錄音兩次。" },
                    { goal: "自然組合想法", whatToSay: "情境：你在工作。說：'I arrived at 9 AM and I started my computer.'", timeRule: "以穩定的節奏說話。", completion: "完成一段錄音，且在 'and' 之前沒有停頓。" }
                ],
                upgrade: { original: "I morning coffee bread.", improved: "I had coffee and bread this morning." }
            }
        },
        vocabulary: {
            beginner: {
                insight: "你過度依賴 'thing' 或 'this'，因為你還沒有掌握日常用品的具體名稱。",
                goal: "你將能毫不猶豫地正確命名辦公室或房間內的 5 個具體物品。",
                tasks: [
                    { goal: "辨識環境", whatToSay: "情境：你正在向某人展示你的辦公桌。說：'This is my laptop. This is my monitor. This is my notebook.'", timeRule: "在 10 秒內指點並說出名稱。", completion: "完成該序列 5 次。" }
                ],
                upgrade: { original: "Give me the thing.", improved: "Please pass me the notebook." }
            }
        },
        pronunciation: {
            beginner: {
                insight: "你省略了單字末尾的 's' 或 't' 音。這讓聽者難以判斷你是在說單數還是複數。",
                goal: "你將在簡短的敘述中清晰地發出 10 個簡單單字的末尾輔音。",
                tasks: [
                    { goal: "結尾輔音強化", whatToSay: "情境：列出物品。說：'Cats. Books. Maps. Hats. Lights.' 強調 's' 和 'ts'。", timeRule: "過度強調結尾發音。", completion: "錄音一次，然後聽聽看是否能聽到末尾的 's'。" }
                ],
                upgrade: { original: "He like cat.", improved: "He likes cats." }
            }
        },
        fluency: {
            beginner: {
                insight: "每當你需要思考單字時，說話就會中斷。這些長時間的停頓會打斷與聽者的連結。",
                goal: "你將能夠連續說話 30 秒，且停頓不超過 2 秒。",
                tasks: [
                    { goal: "持續輸出", whatToSay: "情境：描述你最喜歡的顏色。說出為什麼喜歡它並命名 3 個該顏色的物品。", timeRule: "說滿 30 秒。", completion: "錄音完成且中途無超過 2 秒的沉默。" }
                ],
                upgrade: { original: "(silence) ... pizza good.", improved: "Well, actually, the pizza was very good." }
            }
        }
    }
};

export const translations = {
  en: {
    // Onboarding
    welcomeBack: "Welcome Back",
    joinClub: "Join Global Voice Club",
    subtitleLogin: "Sign in to continue your progress.",
    subtitleSignup: "Your personal AI-powered English communication coach.",
    signIn: "Sign In",
    signUp: "Sign Up",
    name: "Name",
    email: "Email",
    password: "Password",
    createPassword: "Create a password",
    enterPassword: "Enter your password",
    forgotPassword: "Forgot Password?",
    startPracticing: "Start Practicing",
    resumeJourney: "Resume Journey",
    sending: "Sending...",
    recoveryEmailSent: "Recovery email sent!",
    backToLogin: "Back to Login",
    sendRecoveryLink: "Send Recovery Link",
    enterEmailForRecovery: "Enter your email to receive a password reset link.",
    invalidCredentials: "Incorrect email or password. Please try again.",
    genericAuthError: "Authentication failed. Please check your details.",
    howToUse: "How to use this app?",
    
    // Header
    profile: "Profile",
    logout: "Log Out",

    // Dashboard
    hello: "Hello",
    streak: "day streak",
    consistency: "Consistency is the key to fluency.",
    startSession: "Start Practice Session",
    avgScore: "Avg. Score",
    bestScore: "Best Score",
    totalWords: "Total Words Spoken",
    topStrength: "Top Strength",
    focusArea: "Focus Area",
    overallProgress: "Overall Fluency Progress",
    last10: "Last 10 Sessions",
    skillProgression: "Skill Progression",
    grammar: "Grammar",
    vocabulary: "Vocabulary",
    pronunciation: "Pronunciation",
    fluency: "Fluency",
    recentSessions: "Recent Sessions",
    speakingPractice: "Speaking Practice",
    focus: "Focus",
    score: "Score",
    level: "Level",
    xp: "XP",
    nextLevel: "Next Level",
    average: "Average",
    prev: "Previous",
    next: "Next",
    page: "Page",
    
    // Action Plan
    actionPlan: "Action Plan",
    recommendedFocus: "Recommended Focus",
    viewDetails: "View Details & Exercises",
    hideDetails: "Hide Details",
    goalLabel: "Speaking Goal",
    tasksLabel: "Targeted Speaking Tasks",
    insightLabel: "Personalized Insight",
    upgradeLabel: "Sentence Upgrade",
    actionLabel: "Action",
    congratsTasks: "All tasks completed! Record more sessions to unlock new strategies.",
    pointsToRefresh: "pts to next refresh",
    
    // Ranks
    rankNovice: "Novice",
    rankExplorer: "Explorer",
    rankRisingStar: "Rising Star",
    rankMaestro: "Maestro",

    // Recorder
    backToDash: "Back to Dashboard",
    startRecording: "Start Recording",
    stopRecording: "Stop Recording",
    recording: "Recording...",
    ready: "Ready",
    analyzing: "Analyzing speech with Gemini...",
    wait: "This may take a few seconds.",
    waitLong: "Processing long audio. Please wait...",
    tip: "Tip: Speak clearly and try to use varied vocabulary. The AI will analyze your grammar, pronunciation, and fluency.",

    // Feedback
    analysisResult: "Analysis Result",
    downloadPdf: "Download PDF Report",
    overall: "Overall",
    detailedBreakdown: "Detailed Breakdown",
    corrections: "Corrections",
    noErrors: "No major errors detected. Excellent work!",
    coachTips: "Coach's Tips",
    transcript: "Transcript",
    xpGained: "XP Gained",
    
    // Profile
    myProfile: "My Profile",
    fullName: "Full Name",
    changePassword: "Change Password",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    passwordRequirement: "To change your password, please enter your current password first.",
    saveChanges: "Save Changes",
    saving: "Saving...",
    backupData: "Backup Data",

    // Feedback System
    reportRate: "Report / Rate",
    rateApp: "Rate App",
    reportProblem: "Report Problem",
    feedbackExperience: "How is your experience so far?",
    feedbackCommentLabel: "Optional comments",
    feedbackBugLabel: "Describe the issue",
    feedbackCommentPlaceholder: "Tell us what you love or what could be better...",
    feedbackBugPlaceholder: "Please explain the problem you encountered...",
    submitFeedback: "Submit Feedback",
    submitting: "Submitting...",
    feedbackSuccess: "Success! Thank you for your feedback.",
    feedbackError: "Error submitting feedback. Please try again."
  },
  zh: {
    // Onboarding
    welcomeBack: "歡迎回來",
    joinClub: "加入 Global Voice Club",
    subtitleLogin: "登入以繼續您的學習進度。",
    subtitleSignup: "您的個人 AI 英語口說教練。",
    signIn: "登入",
    signUp: "註冊",
    name: "姓名",
    email: "電子郵件",
    password: "密碼",
    createPassword: "建立密碼",
    enterPassword: "輸入密碼",
    forgotPassword: "忘記密碼？",
    startPracticing: "開始練習",
    resumeJourney: "繼續旅程",
    sending: "發送中...",
    recoveryEmailSent: "恢復郵件已發送！",
    backToLogin: "返回登入",
    sendRecoveryLink: "發送重置連結",
    enterEmailForRecovery: "輸入您的電子郵件以接收密碼重置連結。",
    invalidCredentials: "電子郵件或密碼錯誤，請重試。",
    genericAuthError: "驗證失敗，請檢查您的資料。",
    howToUse: "如何使用此應用程式？",

    // Header
    profile: "個人檔案",
    logout: "登出",

    // Dashboard
    hello: "哈囉",
    streak: "天連續練習",
    consistency: "持之以恆是流利的關鍵。",
    startSession: "開始練習課程",
    avgScore: "平均分數",
    bestScore: "最高分數",
    totalWords: "總說話字數",
    topStrength: "最佳強項",
    focusArea: "加強重點",
    overallProgress: "整體流利度進展",
    last10: "最近 10 次課程",
    skillProgression: "技能進展",
    grammar: "文法",
    vocabulary: "字彙",
    pronunciation: "發音",
    fluency: "流利度",
    recentSessions: "最近課程",
    speakingPractice: "口說練習",
    focus: "重點",
    score: "分數",
    level: "等級",
    xp: "經驗值",
    nextLevel: "下個等級",
    average: "平均",
    prev: "上一頁",
    next: "下一頁",
    page: "頁",
    
    // Action Plan
    actionPlan: "學習行動計畫",
    recommendedFocus: "建議加強",
    viewDetails: "查看詳情與練習",
    hideDetails: "隱藏詳情",
    goalLabel: "說話目標",
    tasksLabel: "針對性練習任務",
    insightLabel: "個人化洞察",
    upgradeLabel: "句子升級",
    actionLabel: "行動",
    congratsTasks: "所有任務已完成！錄製更多課程以解鎖新策略。",
    pointsToRefresh: "分後刷新建議",

    // Ranks
    rankNovice: "新手",
    rankExplorer: "探索者",
    rankRisingStar: "明日之星",
    rankMaestro: "大師",

    // Recorder
    backToDash: "返回儀表板",
    startRecording: "開始錄音",
    stopRecording: "停止錄音",
    recording: "錄音中...",
    ready: "準備就緒",
    analyzing: "Gemini 正在分析您的語音...",
    wait: "這可能需要幾秒鐘。",
    waitLong: "正在處理長錄音，請稍候...",
    tip: "提示：清晰地說話並嘗試使用多樣化的詞彙。AI 將分析您的文法、發音和流利度。",

    // Feedback
    analysisResult: "分析結果",
    downloadPdf: "下載 PDF 報告",
    overall: "整體",
    detailedBreakdown: "詳細分析",
    corrections: "修正建議",
    noErrors: "未檢測到重大錯誤。做得好！",
    coachTips: "教練提示",
    transcript: "逐字稿",
    xpGained: "獲得經驗值",

    // Profile
    myProfile: "我的個人檔案",
    fullName: "全名",
    changePassword: "更改密碼",
    currentPassword: "目前密碼",
    newPassword: "新密碼",
    confirmNewPassword: "確認新密碼",
    passwordRequirement: "若要更改密碼，請先輸入您目前的密碼。",
    saveChanges: "儲存變更",
    saving: "儲存中...",
    backupData: "備份數據",

    // Feedback System
    reportRate: "報告問題 / 評分",
    rateApp: "應用程式評分",
    reportProblem: "回報問題",
    feedbackExperience: "您目前的體驗如何？",
    feedbackCommentLabel: "意見（選填）",
    feedbackBugLabel: "問題描述",
    feedbackCommentPlaceholder: "告訴我們您喜歡的地方或可以改進的地方...",
    feedbackBugPlaceholder: "請詳細描述您遇到的問題...",
    submitFeedback: "提交意見",
    submitting: "提交中...",
    feedbackSuccess: "提交成功！感謝您的意見。",
    feedbackError: "提交失敗，請稍後再試。"
  }
};
