import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CLASSES = [
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
];

interface ClassSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export function ClassSelect({ value, onChange, placeholder = 'Select class', required, disabled }: ClassSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} required={required} disabled={disabled}>
      <SelectTrigger className="h-12 rounded-xl bg-background">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-card border-border z-50">
        {CLASSES.map((cls) => (
          <SelectItem key={cls} value={cls} className="cursor-pointer hover:bg-accent">
            {cls}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { CLASSES };
