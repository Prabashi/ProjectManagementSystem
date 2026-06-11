import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import type { ProjectMember } from '../../types';

interface Props {
  members: ProjectMember[];
  value: string;
  onChange: (userId: string) => void;
}

export default function AssigneeFilter({ members, value, onChange }: Props) {
  return (
    <FormControl size="small" sx={{ minWidth: 180 }}>
      <InputLabel id="assignee-filter-label">Assignee</InputLabel>
      <Select
        labelId="assignee-filter-label"
        label="Assignee"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <MenuItem value="">All members</MenuItem>
        {members.map((m) => (
          <MenuItem key={m.userId} value={m.userId}>{m.username}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
