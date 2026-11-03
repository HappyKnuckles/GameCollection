import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import QueensScreen from '../features/queens/screens/Queens';
import SudokuScreen from '../features/sudoku/screens/Sudoku';
import PixelCollectScreen from '../features/pixelcollect/screens/PixelCollect';

const Tab = createBottomTabNavigator();

const Tabs: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Queens" 
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Queens" component={QueensScreen} />
      <Tab.Screen name="Sudoku" component={SudokuScreen} />
      <Tab.Screen name="Pixel Collect" component={PixelCollectScreen} />
    </Tab.Navigator>
  );
};

export default Tabs;
