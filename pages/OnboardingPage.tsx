import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  School, 
  GraduationCap, 
  Globe, 
  User, 
  Target,
  Sparkles,
  Loader2
} from 'lucide-react';
import { 
  OnboardingWelcomeIllustration, 
  EducationLevelIllustration,
  RobotIllustration
} from '../components/Illustrations.tsx';
import { db } from '../lib/database.ts';

type EducationLevel = 'school' | 'college' | null;

const LANGUAGES = ['English', 'Spanish', 'Hindi', 'French', 'German', 'Chinese', 'Japanese', 'Arabic'];
const COLLEGE_FIELDS = ['Engineering', 'Medical', 'Commerce', 'Arts', 'Management', 'Law', 'Science'];
const ENGINEERING_DOMAINS = ['CSE', 'ECE', 'Mechanical', 'Civil', 'Electrical', 'IT', 'AI & DS'];
const MEDICAL_COURSES = ['MBBS', 'BDS', 'BAMS', 'BHMS', 'BPT'];
const COMMERCE_COURSES = ['B.Com', 'M.Com', 'CA', 'CS', 'BBA'];

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    languages: [] as string[],
    gender: '',
    age: '',
    educationLevel: null as EducationLevel,
    class: '',
    field: '',
    course: '',
    domain: '',
    goals: [] as string[],
    learningStyles: [] as string[]
  });

  const totalSteps = 4;

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const toggleItem = (field: 'languages' | 'goals' | 'learningStyles', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value) 
        ? prev[field].filter(item => item !== value) 
        : [...prev[field], value]
    }));
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      // Spread formData but don't include fullName (it's not in the form).
      // saveProfile will preserve the existing name from the profile row
      // (set during OAuth or email signup) because undefined fields are stripped.
      await db.saveProfile({
        languages: formData.languages,
        gender: formData.gender,
        age: formData.age,
        educationLevel: formData.educationLevel,
        class: formData.class,
        field: formData.field,
        course: formData.course,
        domain: formData.domain,
        goals: formData.goals,
        learningStyles: formData.learningStyles,
        onboarded: true
      });
      navigate('/app');
    } catch (error) {
      console.error('Failed to save profile:', error);
      setIsSaving(false);
    }
  };

  const isStepValid = () => {
    if (step === 1) return formData.languages.length > 0 && formData.gender && formData.age;
    if (step === 2) return formData.educationLevel !== null;
    if (step === 3) {
      if (formData.educationLevel === 'school') return formData.class !== '';
      return formData.field !== '' && formData.course !== '';
    }
    if (step === 4) return formData.goals.length > 0 && formData.learningStyles.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 transition-colors duration-200">
      {/* Progress Bar */}
      <div className="w-full max-w-2xl mb-12">
        <div className="flex justify-between mb-4 px-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div 
              key={i} 
              className={`text-[10px] font-black uppercase tracking-widest transition-colors ${step > i ? 'text-peach' : 'text-zinc-300 dark:text-zinc-700'}`}
            >
              Step {i + 1}
            </div>
          ))}
        </div>
        <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-peach transition-all duration-500 ease-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-[48px] shadow-2xl shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Illustrative Sidebar */}
        <div className="md:w-1/3 bg-peach/5 dark:bg-zinc-800/50 p-12 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800">
          {step === 1 && <OnboardingWelcomeIllustration className="w-full h-auto mb-8" />}
          {step === 2 && <EducationLevelIllustration className="w-full h-auto mb-8" />}
          {step === 3 && <RobotIllustration className="w-full h-auto mb-8" />}
          {step === 4 && <div className="p-10 bg-white dark:bg-zinc-800 rounded-3xl shadow-xl animate-float"><Target size={80} className="text-peach" /></div>}
          
          <h2 className="text-xl font-bold dark:text-white mb-2">
            {step === 1 && "Basic Setup"}
            {step === 2 && "Education Level"}
            {step === 3 && "Deep Profiling"}
            {step === 4 && "Final Touches"}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {step === 1 && "Tell us a bit about yourself to start."}
            {step === 2 && "How should we tailor your modules?"}
            {step === 3 && "Let's get specific about your studies."}
            {step === 4 && "Almost there! How do you like to learn?"}
          </p>
        </div>

        {/* Form Content */}
        <div className="flex-1 p-12 flex flex-col justify-between">
          <div className="space-y-8 animate-draw">
            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4 flex items-center gap-2">
                    <Globe size={14} /> Preferred Languages (Select Multiple)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang}
                        onClick={() => toggleItem('languages', lang)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                          formData.languages.includes(lang)
                            ? 'bg-peach border-peach text-white shadow-lg shadow-peach/20'
                            : 'bg-zinc-100 dark:bg-zinc-800 border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4 flex items-center gap-2">
                      <User size={14} /> Gender
                    </label>
                    <select 
                      value={formData.gender}
                      onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl p-4 outline-none font-bold text-zinc-700 dark:text-white appearance-none"
                    >
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">Age</label>
                    <input 
                      type="number"
                      placeholder="Your age"
                      value={formData.age}
                      onChange={e => setFormData(prev => ({ ...prev, age: e.target.value }))}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl p-4 outline-none font-bold text-zinc-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">I am a...</label>
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, educationLevel: 'school' }))}
                    className={`flex items-center gap-6 p-8 rounded-3xl border-2 transition-all group text-left ${
                      formData.educationLevel === 'school'
                        ? 'border-peach bg-peach/5'
                        : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:border-zinc-200 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                      formData.educationLevel === 'school' ? 'bg-peach text-white shadow-xl shadow-peach/20' : 'bg-white dark:bg-zinc-700 text-zinc-400'
                    }`}>
                      <School size={32} />
                    </div>
                    <div>
                      <h4 className={`text-lg font-black ${formData.educationLevel === 'school' ? 'text-peach' : 'text-zinc-900 dark:text-white'}`}>School Student</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Class 1 to Class 12</p>
                    </div>
                    {formData.educationLevel === 'school' && <Check className="ml-auto text-peach" size={24} />}
                  </button>

                  <button
                    onClick={() => setFormData(prev => ({ ...prev, educationLevel: 'college' }))}
                    className={`flex items-center gap-6 p-8 rounded-3xl border-2 transition-all group text-left ${
                      formData.educationLevel === 'college'
                        ? 'border-peach bg-peach/5'
                        : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:border-zinc-200 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                      formData.educationLevel === 'college' ? 'bg-peach text-white shadow-xl shadow-peach/20' : 'bg-white dark:bg-zinc-700 text-zinc-400'
                    }`}>
                      <GraduationCap size={32} />
                    </div>
                    <div>
                      <h4 className={`text-lg font-black ${formData.educationLevel === 'college' ? 'text-peach' : 'text-zinc-900 dark:text-white'}`}>College Student</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Undergrad, Postgrad, PhD</p>
                    </div>
                    {formData.educationLevel === 'college' && <Check className="ml-auto text-peach" size={24} />}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {formData.educationLevel === 'school' ? (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">Select your Class</label>
                    <div className="grid grid-cols-4 gap-3">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setFormData(prev => ({ ...prev, class: (i + 1).toString() }))}
                          className={`p-4 rounded-xl font-black transition-all ${
                            formData.class === (i + 1).toString()
                              ? 'bg-peach text-white'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">Field of Study</label>
                      <div className="flex flex-wrap gap-2">
                        {COLLEGE_FIELDS.map(f => (
                          <button
                            key={f}
                            onClick={() => setFormData(prev => ({ ...prev, field: f, course: '', domain: '' }))}
                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                              formData.field === f
                                ? 'bg-peach border-peach text-white'
                                : 'bg-zinc-100 dark:bg-zinc-800 border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {formData.field && (
                      <div className="animate-draw">
                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">Course / Degree</label>
                        <div className="flex flex-wrap gap-2">
                          {(formData.field === 'Engineering' ? ['B.Tech', 'M.Tech', 'PhD', 'B.E.'] : 
                            formData.field === 'Medical' ? MEDICAL_COURSES : 
                            formData.field === 'Commerce' ? COMMERCE_COURSES : ['BA', 'MA', 'B.Sc', 'M.Sc']).map(c => (
                            <button
                              key={c}
                              onClick={() => setFormData(prev => ({ ...prev, course: c }))}
                              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                                formData.course === c
                                  ? 'bg-peach border-peach text-white'
                                  : 'bg-zinc-100 dark:bg-zinc-800 border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.field === 'Engineering' && formData.course && (
                      <div className="animate-draw">
                        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">Domain / Specialization</label>
                        <div className="flex flex-wrap gap-2">
                          {ENGINEERING_DOMAINS.map(d => (
                            <button
                              key={d}
                              onClick={() => setFormData(prev => ({ ...prev, domain: d }))}
                              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                                formData.domain === d
                                  ? 'bg-peach border-peach text-white'
                                  : 'bg-zinc-100 dark:bg-zinc-800 border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4 flex items-center justify-between">
                    Primary Learning Goals (Select Multiple)
                    <span className="text-[10px] bg-peach/10 text-peach px-2 py-0.5 rounded-full">Required</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Exam Preparation', 'Skill Building', 'General Knowledge', 'Career Change'].map(g => (
                      <button
                        key={g}
                        onClick={() => toggleItem('goals', g)}
                        className={`p-4 rounded-2xl text-sm font-bold border transition-all text-left flex items-center justify-between group ${
                          formData.goals.includes(g)
                            ? 'bg-peach border-peach text-white shadow-lg shadow-peach/20'
                            : 'bg-zinc-100 dark:bg-zinc-800 border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {g}
                        {formData.goals.includes(g) && <Check size={16} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4 flex items-center justify-between">
                    Preferred Learning Styles (Select Multiple)
                    <span className="text-[10px] bg-peach/10 text-peach px-2 py-0.5 rounded-full">Required</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Visual (Videos/Graphs)', 'Textual (Detailed Reading)', 'Interactive (Quizzes)', 'Practical (Exercises)'].map(s => (
                      <button
                        key={s}
                        onClick={() => toggleItem('learningStyles', s)}
                        className={`p-4 rounded-2xl text-sm font-bold border transition-all text-left flex items-center justify-between group ${
                          formData.learningStyles.includes(s)
                            ? 'bg-peach border-peach text-white shadow-lg shadow-peach/20'
                            : 'bg-zinc-100 dark:bg-zinc-800 border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {s}
                        {formData.learningStyles.includes(s) && <Check size={16} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={prevStep}
              disabled={step === 1 || isSaving}
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-0"
            >
              <ChevronLeft size={20} /> <span className="font-bold text-sm">Back</span>
            </button>
            
            <button
              onClick={step === totalSteps ? handleFinish : nextStep}
              disabled={!isStepValid() || isSaving}
              className={`px-10 py-5 rounded-2xl font-bold flex items-center gap-2 transition-all ${
                isStepValid() 
                  ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-xl' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <Loader2 size={20} className="animate-spin" />
              ) : step === totalSteps ? (
                <>Finish Profile <Sparkles size={18} /></>
              ) : (
                <>Next Step <ChevronRight size={20} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;