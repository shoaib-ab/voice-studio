import React from 'react';
import { StudioProvider, useStudio } from '@/context/StudioContext';
import { AppShell } from '@/components/AppShell';
import { CloneWorkspace } from '@/workspaces/CloneWorkspace';
import { DesignWorkspace } from '@/workspaces/DesignWorkspace';
import { GalleryWorkspace, PersonasWorkspace } from '@/workspaces/GalleryWorkspace';
import { DubWorkspace } from '@/workspaces/DubWorkspace';
import { StoriesWorkspace } from '@/workspaces/StoriesWorkspace';
import { TranscriptionsWorkspace } from '@/workspaces/TranscriptionsWorkspace';
import {
  BatchWorkspace,
  CallsWorkspace,
  IntegrationsWorkspace,
  ProjectsWorkspace,
  SettingsWorkspace,
  ToolsWorkspace,
} from '@/workspaces/SecondaryWorkspaces';

function ActiveWorkspaceRouter() {
  const { route } = useStudio();
  switch (route) {
    case '/clone':
      return <CloneWorkspace />;
    case '/design':
      return <DesignWorkspace />;
    case '/gallery':
      return <GalleryWorkspace />;
    case '/personas':
      return <PersonasWorkspace />;
    case '/dub':
      return <DubWorkspace />;
    case '/stories':
      return <StoriesWorkspace mode="stories" />;
    case '/audiobook':
      return <StoriesWorkspace mode="audiobook" />;
    case '/transcriptions':
      return <TranscriptionsWorkspace />;
    case '/batch':
      return <BatchWorkspace />;
    case '/tools':
      return <ToolsWorkspace />;
    case '/calls':
      return <CallsWorkspace />;
    case '/projects':
      return <ProjectsWorkspace />;
    case '/integrations':
      return <IntegrationsWorkspace />;
    case '/settings':
      return <SettingsWorkspace />;
    default:
      return <CloneWorkspace />;
  }
}

export function App() {
  return (
    <StudioProvider>
      <AppShell>
        <ActiveWorkspaceRouter />
      </AppShell>
    </StudioProvider>
  );
}

export default App;
