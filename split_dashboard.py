import os
import re

with open('frontend/src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# Extract PasswordChangeModal
modal_match = re.search(r'function PasswordChangeModal.*?^\}', content, re.MULTILINE | re.DOTALL)
modal_code = modal_match.group(0)

# Extract EventCard
event_card_match = re.search(r'const EventCard = memo\(function EventCard.*?^\}\);', content, re.MULTILINE | re.DOTALL)
event_card_code = event_card_match.group(0)

# Extract TaskRow
task_row_match = re.search(r'const TaskRow = memo\(function TaskRow.*?^\}\);', content, re.MULTILINE | re.DOTALL)
task_row_code = task_row_match.group(0)

os.makedirs('frontend/src/features/dashboard/components', exist_ok=True)

# Write PasswordChangeModal.tsx
modal_imports = """import { useState } from 'react';
import * as api from '../../../api/client';
"""
with open('frontend/src/features/dashboard/components/PasswordChangeModal.tsx', 'w') as f:
    f.write(modal_imports + "\nexport " + modal_code)

# Write TaskRow.tsx
task_row_imports = """import { useState, memo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { X, AlertTriangle, Check, Wrench, RotateCcw, Send } from 'lucide-react';
import * as api from '../../../api/client';
import type { Task } from '../../../types';
"""
with open('frontend/src/features/dashboard/components/TaskRow.tsx', 'w') as f:
    f.write(task_row_imports + "\nexport " + task_row_code)

# Write EventCard.tsx
event_card_imports = """import { useState, memo } from 'react';
import { ChevronDown, ChevronRight, Clock, Bell } from 'lucide-react';
import * as api from '../../../api/client';
import type { DashboardEvent, Task } from '../../../types';
import { formatEventDateTime } from '../../../utils/dateFormat';
import { TaskRow } from './TaskRow';
"""
with open('frontend/src/features/dashboard/components/EventCard.tsx', 'w') as f:
    f.write(event_card_imports + "\nexport " + event_card_code)

# Rewrite Dashboard.tsx
dashboard_code = content.replace(modal_code, '').replace(event_card_code, '').replace(task_row_code, '')

new_imports = """
import { PasswordChangeModal } from '../features/dashboard/components/PasswordChangeModal';
import { EventCard } from '../features/dashboard/components/EventCard';
"""

# add the imports to Dashboard.tsx
lines = dashboard_code.split('\n')
for i, line in enumerate(lines):
    if line.startswith('import { ThemeToggle }'):
        lines.insert(i + 1, new_imports)
        break

with open('frontend/src/pages/Dashboard.tsx', 'w') as f:
    f.write('\n'.join(lines))

print("Split Dashboard complete!")
