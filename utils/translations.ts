

export type Language = 'en' | 'zh';

// Action Plan Suggestion Dictionary
export const actionPlan = {
    en: {
        grammar: {
            beginner: {
                title: "Master Simple Sentence Structures",
                details: "At this stage, your goal is to build a solid foundation. Focus on Subject-Verb-Object (S-V-O) order. Avoid complex clauses for now.",
                tasks: [
                    "Write 5 simple sentences about your day every morning.",
                    "Practice the past tense regular verbs ending in '-ed'.",
                    "Read a children's book aloud to see simple grammar in action."
                ]
            },
            intermediate: {
                title: "Connecting Your Ideas",
                details: "You are ready to move beyond short sentences. Start using conjunctions to create flow and express complex thoughts.",
                tasks: [
                    "Combine two sentences using 'because', 'although', or 'however'.",
                    "Practice the Present Perfect tense (e.g., 'I have been...').",
                    "Watch English news and write down complex sentences you hear."
                ]
            },
            advanced: {
                title: "Refining Nuance and Precision",
                details: "Your grammar is strong. Now focus on precision, style, and native-like phrasing using advanced articles and prepositions.",
                tasks: [
                    "Study 'conditional' sentences (If I had known...).",
                    "Read an academic article and analyze the sentence structures.",
                    "Practice using passive voice for formal descriptions."
                ]
            }
        },
        vocabulary: {
            beginner: {
                title: "Building Your Daily Toolkit",
                details: "Expand your ability to name the world around you. Focus on high-frequency verbs and nouns.",
                tasks: [
                    "Label 5 objects in your room with English sticky notes.",
                    "Learn 3 new verbs related to your daily routine.",
                    "Describe your breakfast using 3 different adjectives."
                ]
            },
            intermediate: {
                title: "Beyond 'Good' and 'Bad'",
                details: "Stop using basic adjectives. Expanding your range of synonyms allows you to express emotions and situations accurately.",
                tasks: [
                    "Find 3 synonyms for 'happy', 'sad', and 'angry'.",
                    "Learn one English idiom per day (e.g., 'Piece of cake').",
                    "Keep a word journal and write a sentence for every new word."
                ]
            },
            advanced: {
                title: "Professional & Academic Proficiency",
                details: "Focus on domain-specific vocabulary and formal language suitable for business or academic settings.",
                tasks: [
                    "Learn phrasal verbs (e.g., 'carry out' instead of 'do').",
                    "Practice explaining a complex topic (like AI or Politics) in 2 minutes.",
                    "Read the editorial section of an English newspaper."
                ]
            }
        },
        pronunciation: {
            beginner: {
                title: "Clarity Over Speed",
                details: "Don't rush. The goal is to be understood. Focus on the distinct sounds that don't exist in your native language.",
                tasks: [
                    "Practice the 'TH' sound (Think vs. Sink) in front of a mirror.",
                    "Read a paragraph slowly and loudly.",
                    "Focus on pronouncing the final consonant of every word."
                ]
            },
            intermediate: {
                title: "Rhythm and Intonation",
                details: "English is a stress-timed language. Focus on which words in a sentence should be louder and longer.",
                tasks: [
                    "Use the 'Shadowing' technique: Repeat instantly after a native speaker video.",
                    "Record yourself saying a sentence and compare it to a native audio.",
                    "Practice linking words together (e.g., 'pick it up' sounds like 'pi-ki-tup')."
                ]
            },
            advanced: {
                title: "Mastering the Native Flow",
                details: "Focus on the subtle aspects of connected speech, reduction, and emotional intonation.",
                tasks: [
                    "Identify and practice 'Schwa' sounds in unstressed syllables.",
                    "Practice emotional intonation: Say 'Really?' in 5 different ways.",
                    "Listen to a podcast and mimic the speaker's breathing and pausing."
                ]
            }
        },
        fluency: {
            beginner: {
                title: "Overcoming the Fear of Speaking",
                details: "The biggest barrier now is hesitation. It is okay to make mistakes. The goal is just to keep sound coming out.",
                tasks: [
                    "Describe your day to yourself in the mirror for 1 minute.",
                    "Don't translate from your native language; think in simple English images.",
                    "Read a short text aloud without stopping, even if you stumble."
                ]
            },
            intermediate: {
                title: "Reducing Pauses",
                details: "Try to eliminate long silences. Use 'filler words' naturally to buy yourself thinking time.",
                tasks: [
                    "Practice talking for 2 minutes on a random topic without stopping.",
                    "Learn fillers like: 'Well...', 'Actually...', 'You know...'.",
                    "Record a voice message to a friend summarizing a movie."
                ]
            },
            advanced: {
                title: "Debate and Persuasion",
                details: "Challenge yourself with complex topics. You should be able to switch between formal and informal tones effortlessly.",
                tasks: [
                    "Record a 3-minute argument for or against a topic.",
                    "Practice speaking faster while maintaining clear enunciation.",
                    "Summarize a news article in 30 seconds."
                ]
            }
        }
    },
    zh: {
        grammar: {
            beginner: {
                title: "掌握簡單句型結構",
                details: "在這個階段，目標是建立穩固的基礎。專注於主詞-動詞-受詞（S-V-O）的順序。暫時避免使用複雜的子句。",
                tasks: [
                    "每天早上寫 5 個關於你一天的簡單句子。",
                    "練習以 '-ed' 結尾的規則動詞過去式。",
                    "大聲朗讀童書，觀察簡單的文法運作。"
                ]
            },
            intermediate: {
                title: "連結你的想法",
                details: "你已經準備好超越短句了。開始使用連接詞來創造流動性並表達複雜的想法。",
                tasks: [
                    "使用 'because'、'although' 或 'however' 連接兩個句子。",
                    "練習現在完成式（例如：'I have been...'）。",
                    "觀看英語新聞並寫下你聽到的複雜句子。"
                ]
            },
            advanced: {
                title: "精修細微差別與精確度",
                details: "你的文法很強。現在專注於精確度、風格，以及使用高級冠詞和介系詞的道地表達方式。",
                tasks: [
                    "研讀「條件句」（If I had known...）。",
                    "閱讀學術文章並分析其句型結構。",
                    "練習使用被動語態進行正式描述。"
                ]
            }
        },
        vocabulary: {
            beginner: {
                title: "建立日常詞彙庫",
                details: "擴展你命名周圍世界的能力。專注於高頻率的動詞和名詞。",
                tasks: [
                    "用英語便利貼標記房間裡的 5 個物品。",
                    "學習 3 個與你日常生活相關的新動詞。",
                    "用 3 個不同的形容詞描述你的早餐。"
                ]
            },
            intermediate: {
                title: "超越 'Good' 和 'Bad'",
                details: "停止使用基本形容詞。擴展同義詞庫能讓你更準確地表達情感和情況。",
                tasks: [
                    "找出 'happy'、'sad' 和 'angry' 的 3 個同義詞。",
                    "每天學習一個英語成語（例如：'Piece of cake'）。",
                    "保持一個單字日記，並為每個新單字造句。"
                ]
            },
            advanced: {
                title: "專業與學術能力",
                details: "專注於適合商業或學術場合的領域特定詞彙和正式語言。",
                tasks: [
                    "學習片語動詞（例如用 'carry out' 代替 'do'）。",
                    "練習在 2 分鐘內解釋一個複雜主題（如 AI 或政治）。",
                    "閱讀英文報紙的社論版面。"
                ]
            }
        },
        pronunciation: {
            beginner: {
                title: "清晰度重於速度",
                details: "不要急。目標是被理解。專注於母語中不存在的獨特發音。",
                tasks: [
                    "在鏡子前練習 'TH' 音（Think vs. Sink）。",
                    "緩慢且大聲地朗讀一段文章。",
                    "專注於發出每個單字的字尾輔音。"
                ]
            },
            intermediate: {
                title: "節奏與語調",
                details: "英語是一種重音計時語言。專注於句子中哪些詞應該更大聲、更長。",
                tasks: [
                    "使用「跟讀法」(Shadowing)：在母語者影片後立即重複。",
                    "錄下自己說的一句話，並與母語音檔進行比較。",
                    "練習連音（例如：'pick it up' 聽起來像 'pi-ki-tup'）。"
                ]
            },
            advanced: {
                title: "掌握母語者的流動感",
                details: "專注於連貫語音、弱化音和情感語調的細微之處。",
                tasks: [
                    "識別並練習非重音音節中的 'Schwa' (央元音)。",
                    "練習情感語調：用 5 種不同的方式說 'Really?'。",
                    "聽 Podcast 並模仿講者的呼吸和停頓。"
                ]
            }
        },
        fluency: {
            beginner: {
                title: "克服開口的恐懼",
                details: "現在最大的障礙是猶豫。犯錯沒關係。目標只是讓聲音持續發出來。",
                tasks: [
                    "在鏡子前用 1 分鐘描述你的一天。",
                    "不要從母語翻譯；試著用簡單的英語圖像思考。",
                    "大聲朗讀短文且不中斷，即使結巴也要繼續。"
                ]
            },
            intermediate: {
                title: "減少停頓",
                details: "嘗試消除長時間的沉默。自然地使用「填充詞」來爭取思考時間。",
                tasks: [
                    "練習針對隨機主題不間斷地說話 2 分鐘。",
                    "學習填充詞，如：'Well...', 'Actually...', 'You know...'.",
                    "錄製語音訊息給朋友，總結一部電影。"
                ]
            },
            advanced: {
                title: "辯論與說服",
                details: "用複雜的主題挑戰自己。你應該能夠輕鬆地在正式和非正式語氣之間切換。",
                tasks: [
                    "針對一個主題錄製 3 分鐘的支持或反對論點。",
                    "練習在保持清晰咬字的同時加快語速。",
                    "在 30 秒內總結一篇新聞文章。"
                ]
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
    fluency: "Fluency",
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
    backupData: "Backup Data"
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
    fluency: "流利度",
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
    backupData: "備份數據"
  }
};