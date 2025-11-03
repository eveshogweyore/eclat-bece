import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Populating quiz data...');

    // Mathematics questions
    const mathQuestions = [
      {
        subject: "Mathematics",
        topic: "Algebra",
        question_text: "What is the value of x in the equation 2x + 5 = 15?",
        correct_answer: "x = 5",
        explanation: "Subtract 5 from both sides: 2x = 10, then divide by 2: x = 5",
        difficulty: "easy",
        options: ["x = 3", "x = 5", "x = 7", "x = 10"]
      },
      {
        subject: "Mathematics",
        topic: "Geometry",
        question_text: "What is the area of a rectangle with length 8cm and width 5cm?",
        correct_answer: "40 cm²",
        explanation: "Area of rectangle = length × width = 8 × 5 = 40 cm²",
        difficulty: "easy",
        options: ["30 cm²", "40 cm²", "45 cm²", "50 cm²"]
      },
      {
        subject: "Mathematics",
        topic: "Fractions",
        question_text: "What is 3/4 + 1/2?",
        correct_answer: "5/4 or 1¼",
        explanation: "Find common denominator: 3/4 + 2/4 = 5/4 = 1¼",
        difficulty: "medium",
        options: ["4/6", "5/6", "5/4 or 1¼", "7/8"]
      },
      {
        subject: "Mathematics",
        topic: "Percentages",
        question_text: "What is 25% of 80?",
        correct_answer: "20",
        explanation: "25% = 25/100 = 0.25, so 0.25 × 80 = 20",
        difficulty: "medium",
        options: ["15", "20", "25", "30"]
      },
      {
        subject: "Mathematics",
        topic: "Number Patterns",
        question_text: "What is the next number in the sequence: 2, 4, 8, 16, __?",
        correct_answer: "32",
        explanation: "Each number is doubled: 2×2=4, 4×2=8, 8×2=16, 16×2=32",
        difficulty: "hard",
        options: ["20", "24", "28", "32"]
      }
    ];

    // English Language questions
    const englishQuestions = [
      {
        subject: "English Language",
        topic: "Grammar",
        question_text: 'Which word is a noun in this sentence: "The cat runs quickly"?',
        correct_answer: "cat",
        explanation: 'A noun is a person, place, or thing. "Cat" is a thing (animal).',
        difficulty: "easy",
        options: ["The", "cat", "runs", "quickly"]
      },
      {
        subject: "English Language",
        topic: "Vocabulary",
        question_text: 'What does the word "enormous" mean?',
        correct_answer: "very large",
        explanation: "Enormous means extremely large or huge in size.",
        difficulty: "easy",
        options: ["very small", "very large", "very fast", "very slow"]
      },
      {
        subject: "English Language",
        topic: "Comprehension",
        question_text: 'In the sentence "She sang beautifully," what is the adverb?',
        correct_answer: "beautifully",
        explanation: 'An adverb describes how an action is performed. "Beautifully" describes how she sang.',
        difficulty: "medium",
        options: ["She", "sang", "beautifully", "None"]
      },
      {
        subject: "English Language",
        topic: "Punctuation",
        question_text: "Which sentence is correctly punctuated?",
        correct_answer: "Hello, how are you?",
        explanation: "Questions need a question mark, and commas separate greeting from question.",
        difficulty: "medium",
        options: ["Hello how are you.", "Hello, how are you?", "Hello how are you?", "Hello. how are you"]
      },
      {
        subject: "English Language",
        topic: "Literature",
        question_text: "What is a metaphor?",
        correct_answer: 'A comparison without using "like" or "as"',
        explanation: 'A metaphor directly compares two things (e.g., "Time is money") unlike a simile which uses "like" or "as".',
        difficulty: "hard",
        options: ['A comparison using "like"', 'A comparison without using "like" or "as"', "A rhyming pattern", "A type of poem"]
      }
    ];

    // Basic Science questions
    const scienceQuestions = [
      {
        subject: "Basic Science",
        topic: "Biology",
        question_text: "What is the largest organ in the human body?",
        correct_answer: "Skin",
        explanation: "The skin is the largest organ, covering and protecting the entire body.",
        difficulty: "easy",
        options: ["Heart", "Liver", "Skin", "Brain"]
      },
      {
        subject: "Basic Science",
        topic: "Physics",
        question_text: "What force pulls objects toward the Earth?",
        correct_answer: "Gravity",
        explanation: "Gravity is the force that attracts objects with mass toward each other, especially toward Earth.",
        difficulty: "easy",
        options: ["Magnetism", "Gravity", "Friction", "Inertia"]
      },
      {
        subject: "Basic Science",
        topic: "Chemistry",
        question_text: "What is the chemical symbol for water?",
        correct_answer: "H₂O",
        explanation: "Water consists of 2 hydrogen atoms and 1 oxygen atom, hence H₂O.",
        difficulty: "medium",
        options: ["O₂", "H₂O", "CO₂", "HO"]
      },
      {
        subject: "Basic Science",
        topic: "Environment",
        question_text: "What is the process by which plants make their own food?",
        correct_answer: "Photosynthesis",
        explanation: "Plants use sunlight, water, and carbon dioxide to create glucose through photosynthesis.",
        difficulty: "medium",
        options: ["Respiration", "Digestion", "Photosynthesis", "Transpiration"]
      },
      {
        subject: "Basic Science",
        topic: "Earth Science",
        question_text: "How many planets are in our solar system?",
        correct_answer: "Eight",
        explanation: "Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune make up the eight planets.",
        difficulty: "hard",
        options: ["Seven", "Eight", "Nine", "Ten"]
      }
    ];

    // Social Studies questions
    const socialQuestions = [
      {
        subject: "Social Studies",
        topic: "Geography",
        question_text: "What is the capital city of Nigeria?",
        correct_answer: "Abuja",
        explanation: "Abuja became the capital of Nigeria in 1991, replacing Lagos.",
        difficulty: "easy",
        options: ["Lagos", "Abuja", "Kano", "Port Harcourt"]
      },
      {
        subject: "Social Studies",
        topic: "History",
        question_text: "In which year did Nigeria gain independence?",
        correct_answer: "1960",
        explanation: "Nigeria gained independence from British colonial rule on October 1, 1960.",
        difficulty: "easy",
        options: ["1950", "1960", "1970", "1980"]
      },
      {
        subject: "Social Studies",
        topic: "Civics",
        question_text: "What does the green color in the Nigerian flag represent?",
        correct_answer: "Agriculture and natural wealth",
        explanation: "The green represents Nigeria's agricultural wealth and natural resources.",
        difficulty: "medium",
        options: ["Peace", "Agriculture and natural wealth", "Unity", "Freedom"]
      },
      {
        subject: "Social Studies",
        topic: "Economics",
        question_text: "What is the main currency used in Nigeria?",
        correct_answer: "Naira",
        explanation: "The Nigerian Naira (₦) is the official currency of Nigeria.",
        difficulty: "medium",
        options: ["Dollar", "Pound", "Naira", "Cedis"]
      },
      {
        subject: "Social Studies",
        topic: "Culture",
        question_text: "How many states are in Nigeria?",
        correct_answer: "36 states",
        explanation: "Nigeria has 36 states plus the Federal Capital Territory (Abuja).",
        difficulty: "hard",
        options: ["30 states", "33 states", "36 states", "40 states"]
      }
    ];

    const allQuestions = [
      ...mathQuestions,
      ...englishQuestions,
      ...scienceQuestions,
      ...socialQuestions
    ];

    // Insert questions and options
    for (const q of allQuestions) {
      const { options, ...questionData } = q;
      
      // Insert question
      const { data: question, error: questionError } = await supabase
        .from('quiz_questions')
        .insert(questionData)
        .select()
        .single();

      if (questionError) {
        console.error('Error inserting question:', questionError);
        continue;
      }

      // Insert options
      const optionsData = options.map((option, index) => ({
        question_id: question.id,
        option_text: option,
        is_correct: option === questionData.correct_answer,
        display_order: index
      }));

      const { error: optionsError } = await supabase
        .from('quiz_options')
        .insert(optionsData);

      if (optionsError) {
        console.error('Error inserting options:', optionsError);
      }
    }

    console.log('Quiz data populated successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Quiz data populated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});