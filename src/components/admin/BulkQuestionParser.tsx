import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  FileText, 
  Sparkles, 
  CheckCircle, 
  Trash2, 
  Edit2, 
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type QuestionType = 'mcq_single' | 'mcq_multiple' | 'true_false' | 'short_answer' | 'long_answer';

interface ParsedQuestion {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_answers: number[];
  marks: number;
}

interface BulkQuestionParserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuestionsAdd: (questions: ParsedQuestion[]) => void;
}

const questionTypeLabels: Record<QuestionType, string> = {
  mcq_single: 'MCQ (Single)',
  mcq_multiple: 'MCQ (Multiple)',
  true_false: 'True / False',
  short_answer: 'Short Answer',
  long_answer: 'Long Answer',
};

export function BulkQuestionParser({ open, onOpenChange, onQuestionsAdd }: BulkQuestionParserProps) {
  const { toast } = useToast();
  const [rawText, setRawText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [step, setStep] = useState<'paste' | 'preview'>('paste');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  const parseQuestions = () => {
    if (!rawText.trim()) {
      toast({
        title: 'No Content',
        description: 'Please paste your questions first.',
        variant: 'destructive',
      });
      return;
    }

    const questions: ParsedQuestion[] = [];
    
    // Split by question patterns like Q1., Q2., 1., 2., Question 1:, etc.
    const questionPatterns = [
      /(?:^|\n)(?:Q\.?\s*)?(\d+)[.):\s]+/gi,
      /(?:^|\n)Question\s*(\d+)[.):\s]*/gi,
    ];
    
    // Try to split by common patterns
    let blocks: string[] = [];
    
    // First, try splitting by Q1., Q2., etc.
    const qPattern = /(?=(?:^|\n)(?:Q\.?\s*)?\d+[.):\s]+)/gmi;
    blocks = rawText.split(qPattern).filter(b => b.trim());
    
    if (blocks.length <= 1) {
      // Try splitting by "Question X" pattern
      const questionPattern = /(?=(?:^|\n)Question\s*\d+[.):\s]*)/gmi;
      blocks = rawText.split(questionPattern).filter(b => b.trim());
    }
    
    if (blocks.length <= 1) {
      // Try splitting by numbered lines
      const numberedPattern = /(?=(?:^|\n)\d+[.)]\s+)/gm;
      blocks = rawText.split(numberedPattern).filter(b => b.trim());
    }

    blocks.forEach((block, index) => {
      const parsed = parseQuestionBlock(block, index);
      if (parsed) {
        questions.push(parsed);
      }
    });

    if (questions.length === 0) {
      toast({
        title: 'Parsing Failed',
        description: 'Could not detect any questions. Please check the format.',
        variant: 'destructive',
      });
      return;
    }

    setParsedQuestions(questions);
    setStep('preview');
    // Expand all by default
    setExpandedCards(new Set(questions.map(q => q.id)));

    toast({
      title: 'Questions Parsed!',
      description: `Found ${questions.length} question(s). Please review before adding.`,
    });
  };

  const parseQuestionBlock = (block: string, index: number): ParsedQuestion | null => {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return null;

    // Remove question number prefix
    let questionText = lines[0].replace(/^(?:Q\.?\s*)?\d+[.):\s]+/i, '').trim();
    questionText = questionText.replace(/^Question\s*\d+[.):\s]*/i, '').trim();
    
    if (!questionText) return null;

    const options: string[] = [];
    let correctAnswers: number[] = [];
    let questionType: QuestionType = 'short_answer';
    let answerText = '';

    // Look for options (A., B., C., D., etc. or a), b), c), d))
    const optionPattern = /^[A-Da-d][.)]\s*(.+)/;
    const answerPattern = /^(?:Answer|Ans|Correct)[:\s]*(.+)/i;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      const optionMatch = line.match(optionPattern);
      if (optionMatch) {
        options.push(optionMatch[1].trim());
        continue;
      }
      
      const answerMatch = line.match(answerPattern);
      if (answerMatch) {
        answerText = answerMatch[1].trim();
        continue;
      }
      
      // If we have options already, this might be part of the answer
      if (options.length === 0 && !answerText) {
        // Append to question if no options found yet
        questionText += ' ' + line;
      }
    }

    // Determine question type and correct answers
    if (options.length >= 2) {
      questionType = 'mcq_single';
      
      // Check if options are just "True" and "False"
      if (options.length === 2) {
        const lowerOptions = options.map(o => o.toLowerCase());
        if (lowerOptions.includes('true') && lowerOptions.includes('false')) {
          questionType = 'true_false';
        }
      }
      
      // Try to find correct answer from answer text
      if (answerText) {
        const answerLetter = answerText.match(/^[A-Da-d]/);
        if (answerLetter) {
          const letterIndex = answerLetter[0].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
          if (letterIndex >= 0 && letterIndex < options.length) {
            correctAnswers = [letterIndex];
          }
        }
        
        // Check for multiple answers like "A, C" or "A and C"
        const multipleAnswers = answerText.match(/[A-Da-d]/g);
        if (multipleAnswers && multipleAnswers.length > 1) {
          questionType = 'mcq_multiple';
          correctAnswers = multipleAnswers.map(l => 
            l.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0)
          ).filter(i => i >= 0 && i < options.length);
        }
      }
    } else {
      // No MCQ options - determine if short or long answer
      if (questionText.length > 100 || questionText.toLowerCase().includes('explain') || 
          questionText.toLowerCase().includes('describe') || questionText.toLowerCase().includes('discuss')) {
        questionType = 'long_answer';
      } else {
        questionType = 'short_answer';
      }
    }

    return {
      id: `parsed-${index}-${Date.now()}`,
      question_text: questionText,
      question_type: questionType,
      options,
      correct_answers: correctAnswers,
      marks: 1,
    };
  };

  const updateQuestion = (id: string, updates: Partial<ParsedQuestion>) => {
    setParsedQuestions(prev => prev.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  const removeQuestion = (id: string) => {
    setParsedQuestions(prev => prev.filter(q => q.id !== id));
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleTypeChange = (id: string, type: QuestionType) => {
    const question = parsedQuestions.find(q => q.id === id);
    if (!question) return;

    let options = question.options;
    
    if (type === 'true_false') {
      options = ['True', 'False'];
    } else if (['short_answer', 'long_answer'].includes(type)) {
      options = [];
    } else if (options.length < 2) {
      options = ['', '', '', ''];
    }
    
    updateQuestion(id, { question_type: type, options, correct_answers: [] });
  };

  const toggleCorrectAnswer = (questionId: string, optionIndex: number, isMultiple: boolean) => {
    const question = parsedQuestions.find(q => q.id === questionId);
    if (!question) return;

    let newCorrect = [...question.correct_answers];
    
    if (isMultiple) {
      if (newCorrect.includes(optionIndex)) {
        newCorrect = newCorrect.filter(i => i !== optionIndex);
      } else {
        newCorrect.push(optionIndex);
      }
    } else {
      newCorrect = [optionIndex];
    }
    
    updateQuestion(questionId, { correct_answers: newCorrect });
  };

  const handleAddAll = () => {
    // Validate
    for (let i = 0; i < parsedQuestions.length; i++) {
      const q = parsedQuestions[i];
      if (!q.question_text.trim()) {
        toast({
          title: 'Invalid Question',
          description: `Question ${i + 1} text is empty.`,
          variant: 'destructive',
        });
        return;
      }
      if (['mcq_single', 'mcq_multiple', 'true_false'].includes(q.question_type)) {
        if (q.correct_answers.length === 0) {
          toast({
            title: 'Missing Answer',
            description: `Please select correct answer(s) for Question ${i + 1}.`,
            variant: 'destructive',
          });
          return;
        }
      }
    }

    onQuestionsAdd(parsedQuestions);
    handleClose();
    
    toast({
      title: 'Questions Added!',
      description: `${parsedQuestions.length} question(s) have been added to your test.`,
    });
  };

  const handleClose = () => {
    setRawText('');
    setParsedQuestions([]);
    setStep('paste');
    setExpandedCards(new Set());
    setEditingId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {step === 'paste' ? 'Bulk Add Questions' : 'Review Parsed Questions'}
          </DialogTitle>
          <DialogDescription>
            {step === 'paste' 
              ? 'Paste questions from ChatGPT, Word, or any source. Supports MCQ, True/False, Short & Long answers.'
              : `Found ${parsedQuestions.length} question(s). Review and edit before adding to your test.`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'paste' ? (
          <div className="flex-1 space-y-4 overflow-y-auto">
            <div className="bg-accent/50 rounded-lg p-4 text-sm">
              <p className="font-medium text-foreground mb-2">Supported formats:</p>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-background p-3 rounded border overflow-x-auto">
{`Q1. What is the capital of France?
A. London
B. Paris
C. Berlin
D. Madrid
Answer: B

Q2. Explain photosynthesis.
Answer: The process by which plants make food...

Q3. Is the Earth round?
A. True
B. False
Answer: A`}
              </pre>
            </div>

            <div className="space-y-2">
              <Label>Paste Your Questions</Label>
              <Textarea
                placeholder="Paste questions here..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="min-h-[250px] font-mono text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {parsedQuestions.map((question, index) => {
              const isExpanded = expandedCards.has(question.id);
              const isEditing = editingId === question.id;
              const hasError = ['mcq_single', 'mcq_multiple', 'true_false'].includes(question.question_type) 
                && question.correct_answers.length === 0;

              return (
                <div 
                  key={question.id} 
                  className={`border rounded-lg overflow-hidden ${hasError ? 'border-destructive/50' : 'border-border'}`}
                >
                  {/* Header */}
                  <div 
                    className="flex items-center gap-3 p-3 bg-accent/30 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => toggleExpand(question.id)}
                  >
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate text-sm">
                        {question.question_text || 'Empty question'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                          {questionTypeLabels[question.question_type]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {question.marks} mark{question.marks !== 1 ? 's' : ''}
                        </span>
                        {hasError && (
                          <span className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            No answer selected
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeQuestion(question.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 bg-background">
                      {/* Question Text */}
                      <div className="space-y-2">
                        <Label className="text-xs">Question Text</Label>
                        <Textarea
                          value={question.question_text}
                          onChange={(e) => updateQuestion(question.id, { question_text: e.target.value })}
                          rows={2}
                          className="text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Type */}
                        <div className="space-y-2">
                          <Label className="text-xs">Type</Label>
                          <Select 
                            value={question.question_type} 
                            onValueChange={(v) => handleTypeChange(question.id, v as QuestionType)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(questionTypeLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Marks */}
                        <div className="space-y-2">
                          <Label className="text-xs">Marks</Label>
                          <Input
                            type="number"
                            min={1}
                            value={question.marks}
                            onChange={(e) => updateQuestion(question.id, { marks: parseInt(e.target.value) || 1 })}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>

                      {/* Options for MCQ */}
                      {['mcq_single', 'mcq_multiple', 'true_false'].includes(question.question_type) && (
                        <div className="space-y-2">
                          <Label className="text-xs">
                            Options {question.question_type === 'mcq_multiple' ? '(select all correct)' : '(select correct)'}
                          </Label>
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                {question.question_type === 'mcq_multiple' ? (
                                  <Checkbox
                                    checked={question.correct_answers.includes(optIndex)}
                                    onCheckedChange={() => toggleCorrectAnswer(question.id, optIndex, true)}
                                  />
                                ) : (
                                  <RadioGroup 
                                    value={question.correct_answers[0]?.toString() || ''}
                                    onValueChange={() => toggleCorrectAnswer(question.id, optIndex, false)}
                                  >
                                    <RadioGroupItem value={optIndex.toString()} />
                                  </RadioGroup>
                                )}
                                <span className="w-6 text-xs text-muted-foreground">
                                  {String.fromCharCode(65 + optIndex)}.
                                </span>
                                {question.question_type === 'true_false' ? (
                                  <span className="text-sm">{option}</span>
                                ) : (
                                  <Input
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [...question.options];
                                      newOptions[optIndex] = e.target.value;
                                      updateQuestion(question.id, { options: newOptions });
                                    }}
                                    className="h-8 text-sm flex-1"
                                    placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                          {question.question_type !== 'true_false' && question.options.length < 6 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuestion(question.id, { 
                                options: [...question.options, ''] 
                              })}
                              className="text-xs"
                            >
                              + Add Option
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2 pt-4 border-t">
          {step === 'paste' ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={parseQuestions}>
                <Sparkles className="w-4 h-4 mr-2" />
                Parse Questions
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('paste')}>
                Back to Edit
              </Button>
              <Button onClick={handleAddAll} disabled={parsedQuestions.length === 0}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Add {parsedQuestions.length} Question{parsedQuestions.length !== 1 ? 's' : ''}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
