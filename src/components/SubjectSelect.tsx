import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SUBJECTS = [
  'Science',
  'Math',
  'English',
  'SST',
  'Hindi',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Other',
];

interface SubjectSelectProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

export function SubjectSelect({ value, onChange, required, placeholder = 'Select subject' }: SubjectSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} required={required}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {SUBJECTS.map((subject) => (
          <SelectItem key={subject} value={subject}>
            {subject}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { SUBJECTS };
