import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
} from 'react-native';

export interface DifficultyItem {
  id: string | number;
  name: string;
  description?: string;
  [key: string]: any;
}

interface GameMenuProps {
  title?: string;
  subtitle?: string;
  difficulties: DifficultyItem[];
  selectedDifficulty: DifficultyItem | null;
  onSelectDifficulty: (diff: DifficultyItem) => void;
  rules?: string | string[] | React.ReactNode;
  maxWidth?: number;
  style?: ViewStyle;
}

const GameMenu: React.FC<GameMenuProps> = ({
  title = 'Game',
  subtitle,
  difficulties,
  selectedDifficulty,
  onSelectDifficulty,
  rules,
  maxWidth = 400,
  style,
}) => {
  const renderRules = () => {
    if (!rules) return null;
    if (typeof rules === 'string') {
      return <Text style={styles.rulesText}>{rules}</Text>;
    }
    if (Array.isArray(rules)) {
      return (
        <View style={styles.rulesList}>
          {rules.map((rule, index) => (
            <Text key={index} style={styles.rulesText}>
              • {rule}
            </Text>
          ))}
        </View>
      );
    }
    return <View>{rules}</View>;
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, style]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      <View style={[styles.sectionContainer, { maxWidth }]}>
        <Text style={styles.sectionTitle}>Select Difficulty</Text>

        <View style={styles.listContainer}>
          {difficulties.map(diff => {
            const isSelected = selectedDifficulty?.id === diff.id;
            return (
              <TouchableOpacity
                key={diff.id}
                activeOpacity={0.7}
                style={[
                  styles.difficultyButton,
                  styles.listItem,
                  isSelected && styles.selectedDifficulty,
                ]}
                onPress={() => onSelectDifficulty(diff)}
              >
                <Text
                  style={[
                    styles.difficultyText,
                    isSelected && styles.selectedDifficultyText,
                  ]}
                >
                  {diff.name}
                </Text>
                {diff.description && (
                  <Text
                    style={[
                      styles.difficultyDesc,
                      isSelected && styles.selectedDifficultyDesc,
                    ]}
                  >
                    {diff.description}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {rules && (
        <View style={[styles.rulesContainer, { maxWidth }]}>
          <Text style={styles.rulesTitle}>How to Play</Text>
          {renderRules()}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  sectionContainer: {
    width: '100%',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#95a5a6',
    marginBottom: 15,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 12,
  },
  difficultyButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  listItem: {
    width: '100%',
  },
  selectedDifficulty: {
    backgroundColor: '#3498db',
    borderColor: '#2980b9',
    shadowOpacity: 0.2,
    elevation: 5,
    transform: [{ scale: 1.02 }],
  },
  difficultyText: {
    fontSize: 17,
    textAlign: 'center',
    color: '#2c3e50',
    fontWeight: '600',
  },
  selectedDifficultyText: {
    color: '#ffffff',
  },
  difficultyDesc: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
    textAlign: 'center',
  },
  selectedDifficultyDesc: {
    color: '#d6eaf8',
  },
  rulesContainer: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  rulesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  rulesList: {
    gap: 8,
  },
  rulesText: {
    fontSize: 15,
    color: '#34495e',
    lineHeight: 24,
  },
});

export default GameMenu;
