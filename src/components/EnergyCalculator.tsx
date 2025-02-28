import React, { useState, useEffect } from 'react';
import { LineChart, XAxis, YAxis, Tooltip, Legend, Line, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Define types 
interface MonthlyData {
  name: string;
  currentTotal: number;
  heatPumpTotal: number;
  savings: number;
}

interface Savings {
  heating: number;
  cooling: number;
  total: number;
}

// Default energy rates 
const DEFAULT_RATES = {
  electricity: 0.15, // $/kWh
  oil: 1.20,         // $/liter
  gas: 1.50,         // $/cubic meter
};

// HVAC system efficiency data 
const SYSTEM_EFFICIENCY = {
  heating: {
    'Oil Furnace': 0.80,
    'Electric Baseboards': 1.0,
    'Gas Furnace': 0.85,
  },
  cooling: {
    'Central AC': { base: 10 },
    'Window AC': { base: 8 },
    'No Cooling': { base: 0 },
  },
  heatPump: {
    heating: 3.5,  // COP for heating
    cooling: 18,   // SEER for cooling
  },
};

// Energy consumption estimates by home size (BTU per sq ft)
const ENERGY_CONSUMPTION = {
  heating: 40,
  cooling: 20,
};

// Season duration in hours 
const SEASON_HOURS = {
  heating: 1200,
  cooling: 800,
};

// Primary accent color (matching SmartCare Home Services branding)
const THEME = {
  primary: 'rgb(63,185,236)', // Blue accent
};

type HeatingSystem = 'Oil Furnace' | 'Electric Baseboards' | 'Gas Furnace';
type CoolingSystem = 'Central AC' | 'Window AC' | 'No Cooling';

const EnergyCalculator: React.FC = () => {
  // State for user inputs
  const [homeSize, setHomeSize] = useState<number>(1500);
  const [heatingSystem, setHeatingSystem] = useState<HeatingSystem>('Oil Furnace');
  const [coolingSystem, setCoolingSystem] = useState<CoolingSystem>('Central AC');
  const [electricityRate, setElectricityRate] = useState<number>(DEFAULT_RATES.electricity);
  const [oilRate, setOilRate] = useState<number>(DEFAULT_RATES.oil);
  const [gasRate, setGasRate] = useState<number>(DEFAULT_RATES.gas);
  const [currentSEER, setCurrentSEER] = useState<number>(10);
  const [useManualInput, setUseManualInput] = useState<boolean>(false);
  const [manualHeatingCost, setManualHeatingCost] = useState<string>('0');
  const [manualCoolingCost, setManualCoolingCost] = useState<string>('0');
  
  // State for calculated values
  const [currentHeatingCost, setCurrentHeatingCost] = useState<number>(0);
  const [currentCoolingCost, setCurrentCoolingCost] = useState<number>(0);
  const [heatPumpHeatingCost, setHeatPumpHeatingCost] = useState<number>(0);
  const [heatPumpCoolingCost, setHeatPumpCoolingCost] = useState<number>(0);
  const [monthlySavings, setMonthlySavings] = useState<Savings>({ heating: 0, cooling: 0, total: 0 });
  const [annualSavings, setAnnualSavings] = useState<Savings>({ heating: 0, cooling: 0, total: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  // Calculate energy costs when inputs change
  useEffect(() => {
    if (useManualInput) {
      const currentHeating = parseFloat(manualHeatingCost) || 0;
      const currentCooling = parseFloat(manualCoolingCost) || 0;
      const heatPumpHeating = currentHeating * (1 / SYSTEM_EFFICIENCY.heatPump.heating);
      const heatPumpCooling = coolingSystem !== 'No Cooling'
        ? currentCooling * (currentSEER / SYSTEM_EFFICIENCY.heatPump.cooling)
        : 0;
      updateCosts(currentHeating, currentCooling, heatPumpHeating, heatPumpCooling);
    } else {
      let heatingCost = 0;
      const heatingBTU = homeSize * ENERGY_CONSUMPTION.heating;
      if (heatingSystem === 'Oil Furnace') {
        const oilLiters = (heatingBTU * SEASON_HOURS.heating) / (36000 * SYSTEM_EFFICIENCY.heating[heatingSystem]);
        heatingCost = oilLiters * oilRate;
      } else if (heatingSystem === 'Electric Baseboards') {
        const kWh = (heatingBTU * SEASON_HOURS.heating) / (3412 * SYSTEM_EFFICIENCY.heating[heatingSystem]);
        heatingCost = kWh * electricityRate;
      } else if (heatingSystem === 'Gas Furnace') {
        const gasVolume = (heatingBTU * SEASON_HOURS.heating) / (35300 * SYSTEM_EFFICIENCY.heating[heatingSystem]);
        heatingCost = gasVolume * gasRate;
      }
      let coolingCost = 0;
      if (coolingSystem !== 'No Cooling') {
        const coolingBTU = homeSize * ENERGY_CONSUMPTION.cooling;
        const kWh = (coolingBTU * SEASON_HOURS.cooling) / (3412 * (currentSEER / 10));
        coolingCost = kWh * electricityRate;
      }
      const heatPumpHeatingKWh = (homeSize * ENERGY_CONSUMPTION.heating * SEASON_HOURS.heating) /
        (3412 * SYSTEM_EFFICIENCY.heatPump.heating);
      const heatPumpHeatingCost = heatPumpHeatingKWh * electricityRate;
      let heatPumpCoolingCost = 0;
      if (coolingSystem !== 'No Cooling') {
        const heatPumpCoolingKWh = (homeSize * ENERGY_CONSUMPTION.cooling * SEASON_HOURS.cooling) /
          (3412 * (SYSTEM_EFFICIENCY.heatPump.cooling / 10));
        heatPumpCoolingCost = heatPumpCoolingKWh * electricityRate;
      }
      updateCosts(heatingCost, coolingCost, heatPumpHeatingCost, heatPumpCoolingCost);
    }
  }, [
    homeSize, heatingSystem, coolingSystem, electricityRate,
    oilRate, gasRate, currentSEER, useManualInput,
    manualHeatingCost, manualCoolingCost
  ]);

  // Helper function to update cost states
  const updateCosts = (currentHeating: number, currentCooling: number, heatPumpHeating: number, heatPumpCooling: number): void => {
    setCurrentHeatingCost(currentHeating);
    setCurrentCoolingCost(currentCooling);
    setHeatPumpHeatingCost(heatPumpHeating);
    setHeatPumpCoolingCost(heatPumpCooling);

    const heatingSavings = currentHeating - heatPumpHeating;
    const coolingSavings = currentCooling - heatPumpCooling;
    const totalSavings = heatingSavings + coolingSavings;

    setMonthlySavings({
      heating: heatingSavings / 12,
      cooling: coolingSavings / 12,
      total: totalSavings / 12,
    });
    setAnnualSavings({
      heating: heatingSavings,
      cooling: coolingSavings,
      total: totalSavings,
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const heatingDistribution = [0.18, 0.16, 0.12, 0.08, 0.04, 0.01, 0.01, 0.01, 0.03, 0.07, 0.12, 0.17];
    const coolingDistribution = [0.01, 0.01, 0.02, 0.05, 0.10, 0.18, 0.22, 0.20, 0.12, 0.06, 0.02, 0.01];

    const data: MonthlyData[] = months.map((month, i) => {
      const currentMonthHeating = currentHeating * heatingDistribution[i];
      const currentMonthCooling = currentCooling * coolingDistribution[i];
      const heatPumpMonthHeating = heatPumpHeating * heatingDistribution[i];
      const heatPumpMonthCooling = heatPumpCooling * coolingDistribution[i];
      return {
        name: month,
        currentTotal: currentMonthHeating + currentMonthCooling,
        heatPumpTotal: heatPumpMonthHeating + heatPumpMonthCooling,
        savings: (currentMonthHeating + currentMonthCooling) - (heatPumpMonthHeating + heatPumpMonthCooling),
      };
    });
    setMonthlyData(data);
  };

  // Format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Tooltip formatter
  const currencyFormatter = (value: number): [string, string] => {
    return [`$${Math.round(value)}`, ''];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold mb-3 text-gray-800">
            HVAC Energy Savings Calculator
          </h1>
          <div className="w-24 h-1 mx-auto bg-blue-500 rounded-full"></div>
          <p className="mt-4 text-gray-600">
            Estimate your potential savings with a high-efficiency cold climate heat pump
          </p>
        </header>

        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Home Details */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-2xl font-semibold mb-6 text-blue-600">Home Details</h2>
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Home Size (sq. ft.)</label>
              <input
                type="range"
                min="500"
                max="4000"
                step="100"
                value={homeSize}
                onChange={(e) => setHomeSize(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-gray-500">500</span>
                <span className="font-medium text-gray-800">{homeSize} sq. ft.</span>
                <span className="text-gray-500">4000</span>
              </div>
            </div>
            <div className="mb-6 flex items-center">
              <input
                type="checkbox"
                id="manualInput"
                checked={useManualInput}
                onChange={() => setUseManualInput(!useManualInput)}
                className="mr-2 accent-blue-500"
              />
              <label htmlFor="manualInput" className="text-gray-700">
                Use manual cost input instead
              </label>
            </div>
            {useManualInput ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-700 mb-2">Annual Heating Cost ($)</label>
                  <input
                    type="number"
                    value={manualHeatingCost}
                    onChange={(e) => setManualHeatingCost(e.target.value)}
                    className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your annual heating cost"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Annual Cooling Cost ($)</label>
                  <input
                    type="number"
                    value={manualCoolingCost}
                    onChange={(e) => setManualCoolingCost(e.target.value)}
                    className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your annual cooling cost"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <label className="block text-gray-700 mb-2">Current Heating System</label>
                  <select
                    value={heatingSystem}
                    onChange={(e) => setHeatingSystem(e.target.value as HeatingSystem)}
                    className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Oil Furnace">Oil Furnace</option>
                    <option value="Electric Baseboards">Electric Baseboards</option>
                    <option value="Gas Furnace">Gas Furnace</option>
                  </select>
                </div>
                <div className="mb-6">
                  <label className="block text-gray-700 mb-2">Current Cooling System</label>
                  <select
                    value={coolingSystem}
                    onChange={(e) => setCoolingSystem(e.target.value as CoolingSystem)}
                    className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Central AC">Central AC</option>
                    <option value="Window AC">Window AC</option>
                    <option value="No Cooling">No Cooling</option>
                  </select>
                </div>
                {coolingSystem !== 'No Cooling' && (
                  <div className="mb-6">
                    <label className="block text-gray-700 mb-2">Current AC SEER Rating</label>
                    <input
                      type="range"
                      min="8"
                      max="16"
                      step="0.5"
                      value={currentSEER}
                      onChange={(e) => setCurrentSEER(parseFloat(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="flex justify-between mt-2 text-sm">
                      <span className="text-gray-500">8</span>
                      <span className="font-medium text-gray-800">{currentSEER} SEER</span>
                      <span className="text-gray-500">16</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Energy Rates */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-2xl font-semibold mb-6 text-blue-600">Energy Rates</h2>
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Electricity Rate ($/kWh)</label>
              <input
                type="number"
                step="0.01"
                value={electricityRate}
                onChange={(e) => setElectricityRate(parseFloat(e.target.value))}
                className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nova Scotia electricity rate"
              />
            </div>
            {heatingSystem === 'Oil Furnace' && (
              <div className="mb-6">
                <label className="block text-gray-700 mb-2">Oil Rate ($/liter)</label>
                <input
                  type="number"
                  step="0.01"
                  value={oilRate}
                  onChange={(e) => setOilRate(parseFloat(e.target.value))}
                  className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Current oil rate"
                />
              </div>
            )}
            {heatingSystem === 'Gas Furnace' && (
              <div className="mb-6">
                <label className="block text-gray-700 mb-2">Gas Rate ($/cubic meter)</label>
                <input
                  type="number"
                  step="0.01"
                  value={gasRate}
                  onChange={(e) => setGasRate(parseFloat(e.target.value))}
                  className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Current gas rate"
                />
              </div>
            )}
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4 text-center text-blue-600">Heat Pump Information</h3>
              <div className="bg-gray-100 p-4 rounded-md border-l-4 border-blue-500">
                <p className="text-gray-700 mb-2">
                  <span className="font-semibold">System:</span> High-Efficiency Cold Climate Heat Pump
                </p>
                <p className="text-gray-700 mb-2">
                  <span className="font-semibold">SEER Rating:</span> {SYSTEM_EFFICIENCY.heatPump.cooling} (Cooling)
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">COP:</span> {SYSTEM_EFFICIENCY.heatPump.heating} (Heating)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm mb-10">
          <h2 className="text-3xl font-bold mb-6 text-center text-blue-600">Your Potential Savings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3 text-blue-600">Current Annual Costs</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Heating:</span>
                  <span className="font-medium text-gray-800">{formatCurrency(currentHeatingCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Cooling:</span>
                  <span className="font-medium text-gray-800">{formatCurrency(currentCoolingCost)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-2">
                  <span className="text-gray-700 font-semibold">Total:</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(currentHeatingCost + currentCoolingCost)}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3 text-blue-600">Heat Pump Annual Costs</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Heating:</span>
                  <span className="font-medium text-gray-800">{formatCurrency(heatPumpHeatingCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Cooling:</span>
                  <span className="font-medium text-gray-800">{formatCurrency(heatPumpCoolingCost)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-2">
                  <span className="text-gray-700 font-semibold">Total:</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(heatPumpHeatingCost + heatPumpCoolingCost)}</span>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3 text-blue-600">Annual Savings</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">Heating:</span>
                  <span className="font-medium text-blue-700">{formatCurrency(annualSavings.heating)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Cooling:</span>
                  <span className="font-medium text-blue-700">{formatCurrency(annualSavings.cooling)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-2">
                  <span className="text-gray-700 font-semibold">Total:</span>
                  <span className="font-semibold text-blue-700">{formatCurrency(annualSavings.total)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-center text-blue-600">Monthly Energy Costs</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <XAxis dataKey="name" stroke="#555" />
                  <YAxis stroke="#555" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#f9fafb', border: 'none' }}
                    labelStyle={{ color: THEME.primary }}
                    formatter={currencyFormatter}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="currentTotal" stroke="#3FBDC4" strokeWidth={3} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="heatPumpTotal" stroke="#3FBDC4" strokeDasharray="5 5" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-center text-blue-600">Monthly Savings</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="name" stroke="#555" />
                  <YAxis stroke="#555" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#f9fafb', border: 'none' }}
                    labelStyle={{ color: THEME.primary }}
                    formatter={currencyFormatter}
                  />
                  <Legend />
                  <Bar dataKey="savings" fill="#3FBDC4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnergyCalculator;
