import { useState } from 'react';
import { Center, Paper, Stack, Title, Text } from '@mantine/core';
import { SignInForm, useMedplumProfile } from '@medplum/react';
import { Shell, type Vista } from './components/Shell';
import { AgendaDelDia } from './pages/AgendaDelDia';
import { Atender } from './pages/Atender';

export function App(): JSX.Element {
  const profile = useMedplumProfile();
  const [vista, setVista] = useState<Vista>('agenda');

  if (!profile) {
    return <Login />;
  }

  return (
    <Shell vista={vista} onVista={setVista}>
      {vista === 'agenda' ? <AgendaDelDia /> : <Atender />}
    </Shell>
  );
}

function Login(): JSX.Element {
  return (
    <Center mih="100vh" bg="gray.0">
      <Paper withBorder shadow="md" p="xl" radius="lg" w={420}>
        <Stack gap="md">
          <Stack gap={2} align="center">
            <Title order={2} c="teal.7">
              BioWellness
            </Title>
            <Text c="dimmed" size="sm">
              Recepción · San Isidro
            </Text>
          </Stack>
          <SignInForm onSuccess={() => undefined}>
            <Text ta="center" size="sm" c="dimmed">
              Ingresá con tu cuenta
            </Text>
          </SignInForm>
        </Stack>
      </Paper>
    </Center>
  );
}
